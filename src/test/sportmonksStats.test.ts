/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/fantasy-espn", () => ({
  default: async (_request: unknown, response: any) => {
    response.status(200).json({
      source: "ESPN",
      generatedAt: "2026-07-13T12:00:00.000Z",
      round: { completedMatches: 4 },
      warnings: [],
      players: [
        {
          id: "1",
          name: "Test Forward",
          teamName: "France",
          teamAbbreviation: "FRA",
          stats: {
            goals: 4,
            assists: 2,
            yellowCards: 0,
            redCards: 0,
          },
        },
        {
          id: "2",
          name: "Test Defender",
          teamName: "England",
          teamAbbreviation: "ENG",
          stats: {
            goals: 0,
            assists: 0,
            yellowCards: 2,
            redCards: 1,
          },
        },
      ],
    });
  },
}));

import handler from "../../api/world-cup-stats";

const responseHarness = () => {
  let statusCode = 200;
  let body: any;
  const headers = new Map<string, string>();

  const response = {
    setHeader: (name: string, value: string) => headers.set(name, value),
    status: (code: number) => {
      statusCode = code;
      return response;
    },
    json: (value: unknown) => {
      body = value;
    },
  };

  return {
    response,
    read: () => ({ statusCode, body, headers }),
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ESPN World Cup statistics route", () => {
  it("builds goals, assists and card leaderboards from fantasy player data", async () => {
    const harness = responseHarness();
    await handler({ method: "GET" }, harness.response);
    const result = harness.read();

    expect(result.statusCode).toBe(200);
    expect(result.body.source).toBe("ESPN FIFA World Cup Fantasy API");
    expect(result.body.playerStatsCount).toBe(2);
    expect(result.body.leaders.goals[0]).toMatchObject({
      name: "Test Forward",
      countryCode: "FRA",
      goals: 4,
      assists: 2,
    });
    expect(result.body.leaders.yellowCards[0]).toMatchObject({
      name: "Test Defender",
      countryCode: "ENG",
      yellowCards: 2,
      redCards: 1,
    });
    expect(result.body.leaders.redCards[0]).toMatchObject({
      name: "Test Defender",
      redCards: 1,
    });
  });

  it("rejects non GET requests", async () => {
    const harness = responseHarness();
    await handler({ method: "POST" }, harness.response);

    expect(harness.read().statusCode).toBe(405);
  });
});
