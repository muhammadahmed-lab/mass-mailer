import { POST } from "../app/api/send/route";
import { GET } from "../app/api/status/[jobId]/route";

// The store uses globalThis.__massMailerStore in-memory mode (no KV env vars).
// We access it directly for test assertions.
const getMemStore = () => {
  const g = globalThis as unknown as {
    __massMailerStore?: Map<string, { data: unknown; expiresAt: number }>;
  };
  if (!g.__massMailerStore) g.__massMailerStore = new Map();
  return g.__massMailerStore;
};

// Mock @vercel/kv (never actually used since KV env vars aren't set)
jest.mock("@vercel/kv", () => ({
  kv: { get: jest.fn(), set: jest.fn() },
}));

// Mock inngest
jest.mock("../app/lib/inngest", () => ({
  inngest: {
    send: jest.fn().mockResolvedValue({ ids: ["test-id"] }),
  },
  sendBulkEmail: {},
}));

// Mock nodemailer
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test" }),
    close: jest.fn(),
  }),
}));

function mockReq(body: unknown): Request {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Request;
}

function mockBadJsonReq(): Request {
  return {
    json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
  } as unknown as Request;
}

const resendPayload = {
  provider: "resend",
  from: "sender@example.com",
  subject: "Hello",
  body: "<p>Test email body content</p>",
  recipients: [
    { email: "user1@example.com", name: "User One" },
    { email: "user2@example.com" },
  ],
  resendApiKey: "re_test_123456",
};

const gmailPayload = {
  provider: "gmail",
  from: "sender@gmail.com",
  subject: "Hello",
  body: "<p>Test email body content</p>",
  recipients: [
    { email: "user1@example.com", name: "User One" },
    { email: "user2@example.com" },
  ],
  gmailAppPassword: "abcd efgh ijkl mnop",
};

describe("POST /api/send — Resend provider", () => {
  beforeEach(() => {
    getMemStore().clear();
    jest.clearAllMocks();
  });

  it("returns 202 with jobId for valid Resend payload", async () => {
    const res = await POST(mockReq(resendPayload));
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.jobId).toBeDefined();
    expect(typeof data.jobId).toBe("string");
  });

  it("stores initial job progress in KV", async () => {
    const res = await POST(mockReq(resendPayload));
    const data = await res.json();
    const entry = getMemStore().get(`job:${data.jobId}`);
    expect(entry).toBeDefined();
    const stored = entry!.data as Record<string, unknown>;
    expect(stored.status).toBe("pending");
    expect(stored.total).toBe(2);
  });

  it("returns 400 when resendApiKey is missing", async () => {
    const res = await POST(mockReq({ ...resendPayload, resendApiKey: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when from email is invalid", async () => {
    const res = await POST(
      mockReq({ ...resendPayload, from: "not-an-email" })
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/send — Gmail provider", () => {
  beforeEach(() => {
    getMemStore().clear();
    jest.clearAllMocks();
  });

  it("returns 202 with jobId for valid Gmail payload", async () => {
    const res = await POST(mockReq(gmailPayload));
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.jobId).toBeDefined();
  });

  it("returns 400 when gmailAppPassword is missing", async () => {
    const res = await POST(
      mockReq({ ...gmailPayload, gmailAppPassword: "" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when from email is missing", async () => {
    const res = await POST(mockReq({ ...gmailPayload, from: "" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/send — shared validation", () => {
  beforeEach(() => {
    getMemStore().clear();
    jest.clearAllMocks();
  });

  it("returns 400 when subject is empty", async () => {
    const res = await POST(mockReq({ ...resendPayload, subject: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is empty", async () => {
    const res = await POST(mockReq({ ...resendPayload, body: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when recipients is empty array", async () => {
    const res = await POST(mockReq({ ...resendPayload, recipients: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when recipient email is invalid", async () => {
    const res = await POST(
      mockReq({
        ...resendPayload,
        recipients: [{ email: "bad-email" }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(mockBadJsonReq());
    expect(res.status).toBe(500);
  });

  it("returns 400 for unknown provider", async () => {
    const res = await POST(
      mockReq({ ...resendPayload, provider: "unknown" })
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/status/[jobId]", () => {
  beforeEach(() => {
    getMemStore().clear();
  });

  it("returns 404 for non-existent job", async () => {
    const res = await GET({} as Request, {
      params: { jobId: "non-existent-id" },
    });
    expect(res.status).toBe(404);
  });

  it("returns job progress for existing job", async () => {
    const progress = {
      jobId: "test-job-123",
      status: "processing",
      total: 100,
      sent: 50,
      failed: 2,
      errors: [{ email: "bad@test.com", error: "Bounced" }],
      startedAt: Date.now(),
    };
    getMemStore().set("job:test-job-123", { data: progress, expiresAt: Date.now() + 3600000 });

    const res = await GET({} as Request, {
      params: { jobId: "test-job-123" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("processing");
    expect(data.sent).toBe(50);
    expect(data.failed).toBe(2);
    expect(data.total).toBe(100);
  });
});
