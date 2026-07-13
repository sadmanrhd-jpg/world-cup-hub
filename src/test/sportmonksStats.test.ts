/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from "vitest";
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
  delete process.env.SPORTMONKS_API_TOKEN;
  delete process.env.SPORTMONKS_WORLD_CUP_SEASON_ID;
});

describe("Sportmonks World Cup statistics route", () => {
  it("returns a configuration response when the token is missing", async () => {
    const harness = responseHarness();
    await handler({}, harness.response);

    expect(harness.read().statusCode).toBe(503);
    expect(harness.read().body.code).toBe("SPORTMONKS_TOKEN_MISSING");
  });

  it("normalizes goals, assists and cards", async () => {
    process.env.SPORTMONKS_API_TOKEN = "test-token";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/football/leagues/732")) {
          return new Response(
            JSON.stringify({ data: { currentseason: { id: 2026 } } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            data: [
              {
                id: 1,
                total: 4,
                player: { display_name: "Test Forward" },
                participant: { name: "France" },
                type: { developer_name: "GOALS" },
              },
              {
                id: 2,
                total: 2,
                player: { display_name: "Test Forward" },
                participant: { name: "France" },
                type: { developer_name: "ASSISTS" },
              },
              {
                id: 3,
                total: 1,
                player: { display_name: "Test Defender" },
                participant: { name: "England" },
                type: { developer_name: "YELLOW_CARDS" },
              },
              {
                id: 4,
                total: 1,
                player: { display_name: "Test Defender" },
                participant: { name: "England" },
                type: { developer_name: "RED_CARDS" },
              },
            ],
            pagination: { has_more: false },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const harness = responseHarness();
    await handler({}, harness.response);
    const result = harness.read();

    expect(result.statusCode).toBe(200);
    expect(result.body.source).toBe("Sportmonks Football API");
    expect(result.body.leaders.goals[0]).toMatchObject({
      name: "Test Forward",
      countryCode: "FRA",
      goals: 4,
      assists: 2,
    });
    expect(result.body.leaders.yellowCards[0]).toMatchObject({
      name: "Test Defender",
      countryCode: "ENG",
      yellowCards: 1,
      redCards: 1,
    });
  });

  it("builds leaders from fixture events when topscorers are unavailable", async () => {
    process.env.SPORTMONKS_API_TOKEN = "test-token";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/football/leagues/732")) {
          return new Response(
            JSON.stringify({ data: { currentseason: { id: 2026 } } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        if (url.includes("/football/topscorers/seasons/")) {
          return new Response(
            JSON.stringify({ message: "This endpoint is not included" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            data: [
              {
                id: 7001,
                season_id: 2026,
                state_id: 5,
                result_info: "France won after full-time.",
                participants: [
                  { id: 10, name: "France", short_code: "FRA" },
                  { id: 20, name: "England", short_code: "ENG" },
                ],
                events: [
                  {
                    id: 1,
                    participant_id: 10,
                    player_name: "Test Forward",
                    related_player_name: "Test Creator",
                    type: { developer_name: "GOAL" },
                  },
                  {
                    id: 2,
                    participant_id: 10,
                    player_name: "Test Forward",
                    type: { developer_name: "YELLOW_CARD" },
                  },
                  {
                    id: 3,
                    participant_id: 20,
                    player_name: "Test Defender",
                    type: { developer_name: "RED_CARD" },
                  },
                ],
              },
            ],
            pagination: { has_more: false },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const harness = responseHarness();
    await handler({}, harness.response);
    const result = harness.read();

    expect(result.statusCode).toBe(200);
    expect(result.body.strategy).toBe("fixture events");
    expect(result.body.leaders.goals[0]).toMatchObject({
      name: "Test Forward",
      countryCode: "FRA",
      goals: 1,
    });
    expect(result.body.leaders.assists[0]).toMatchObject({
      name: "Test Creator",
      assists: 1,
    });
    expect(result.body.leaders.redCards[0]).toMatchObject({
      name: "Test Defender",
      countryCode: "ENG",
      redCards: 1,
    });
  });

});
