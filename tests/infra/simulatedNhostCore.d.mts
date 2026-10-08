export interface SimulatedRequest {
  query: string;
  variables: Record<string, unknown> | undefined;
  /** The signed-in account the request was made as; null when anonymous. */
  userId: string | null;
}

export interface SimulatedControl {
  /** Every later GraphQL request fails to connect. */
  outage: boolean;
  /** The next N compare-and-swap requests get a 502 page BEFORE they commit. */
  gatewayBeforeCommit: number;
  /** The next N compare-and-swap requests COMMIT and then lose their answer. */
  loseResponseAfterCommit: number;
}

export interface SimulatedNhost {
  fetch: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  control: SimulatedControl;
  requests: SimulatedRequest[];
  rowsOf(email: string): Array<Record<string, unknown>>;
  corrupt(email: string, slot: number, payload: string): void;
  snapshot(): {
    rows: Record<string, number>;
    graphqlRequests: number;
    outage: boolean;
  };
}

export function createSimulatedNhost(options?: {
  mode?: string;
}): SimulatedNhost;
