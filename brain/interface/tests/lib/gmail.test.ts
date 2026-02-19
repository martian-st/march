import { describe, it, expect } from "vitest";
import {
  parseSenderField,
  parseEmailHeaders,
  parseEmailBody,
} from "@/lib/gmail";

describe("parseSenderField", () => {
  it("parses 'Display Name <email>' format", () => {
    const result = parseSenderField("John Doe <john@example.com>");
    expect(result).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("parses bare email address", () => {
    const result = parseSenderField("john@example.com");
    expect(result).toEqual({
      name: "john@example.com",
      email: "john@example.com",
    });
  });

  it("parses angle-bracket-only email", () => {
    const result = parseSenderField("<john@example.com>");
    expect(result).toEqual({
      name: "john@example.com",
      email: "john@example.com",
    });
  });

  it("parses quoted name with comma", () => {
    const result = parseSenderField('"Doe, John" <john@example.com>');
    expect(result).toEqual({ name: "Doe, John", email: "john@example.com" });
  });

  it("handles empty string gracefully", () => {
    const result = parseSenderField("");
    expect(result.name).toBeDefined();
    expect(result.email).toBeDefined();
  });
});

describe("parseEmailHeaders", () => {
  it("extracts standard headers", () => {
    const headers = [
      { name: "Subject", value: "Test Email" },
      { name: "From", value: "sender@example.com" },
      { name: "Date", value: "Mon, 1 Jan 2024 12:00:00 +0000" },
      { name: "Message-ID", value: "<msg123@example.com>" },
      { name: "References", value: "<ref1@example.com>" },
    ];

    const result = parseEmailHeaders(headers);
    expect(result.subject).toBe("Test Email");
    expect(result.from).toBe("sender@example.com");
    expect(result.date).toBe("Mon, 1 Jan 2024 12:00:00 +0000");
    expect(result.messageId).toBe("<msg123@example.com>");
    expect(result.references).toBe("<ref1@example.com>");
  });

  it("returns defaults for missing headers", () => {
    const result = parseEmailHeaders([]);
    expect(result.subject).toBe("No Subject");
    expect(result.from).toBe("Unknown Sender");
    expect(result.date).toBe("");
    expect(result.messageId).toBe("");
    expect(result.references).toBe("");
  });

  it("handles case-insensitive header names", () => {
    const headers = [
      { name: "subject", value: "lowercase" },
      { name: "FROM", value: "uppercase@test.com" },
    ];

    const result = parseEmailHeaders(headers);
    expect(result.subject).toBe("lowercase");
    expect(result.from).toBe("uppercase@test.com");
  });
});

describe("parseEmailBody", () => {
  it("extracts text/plain from simple payload", () => {
    const payload = {
      mimeType: "text/plain",
      body: {
        data: Buffer.from("Hello world").toString("base64url"),
      },
    };

    expect(parseEmailBody(payload)).toBe("Hello world");
  });

  it("extracts text/plain from multipart/alternative", () => {
    const payload = {
      mimeType: "multipart/alternative",
      parts: [
        {
          mimeType: "text/plain",
          body: {
            data: Buffer.from("Plain text version").toString("base64url"),
          },
        },
        {
          mimeType: "text/html",
          body: {
            data: Buffer.from("<p>HTML version</p>").toString("base64url"),
          },
        },
      ],
    };

    expect(parseEmailBody(payload)).toBe("Plain text version");
  });

  it("handles nested multipart/mixed with multipart/alternative", () => {
    const payload = {
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/plain",
              body: {
                data: Buffer.from("Nested plain text").toString("base64url"),
              },
            },
          ],
        },
        {
          mimeType: "application/pdf",
          body: { data: "binary-data" },
        },
      ],
    };

    expect(parseEmailBody(payload)).toBe("Nested plain text");
  });

  it("returns empty string when no text parts found", () => {
    const payload = {
      mimeType: "multipart/alternative",
      parts: [
        {
          mimeType: "text/html",
          body: {
            data: Buffer.from("<p>Only HTML</p>").toString("base64url"),
          },
        },
      ],
    };

    expect(parseEmailBody(payload)).toBe("");
  });

  it("returns empty string for undefined payload", () => {
    expect(parseEmailBody(undefined)).toBe("");
  });

  it("handles missing body.data gracefully", () => {
    const payload = {
      mimeType: "text/plain",
      body: {},
    };

    expect(parseEmailBody(payload)).toBe("");
  });
});
