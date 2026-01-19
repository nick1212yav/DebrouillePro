/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — DATABASE INTEGRATION TESTS (WORLD #1 FINAL)       */
/* -------------------------------------------------------------------------- */

import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "@/database/connect";

describe("Integration / Database", () => {
  it("should connect and disconnect MongoDB successfully", async () => {
    await connectDatabase();
    expect(mongoose.connection.readyState).toBe(1);

    await disconnectDatabase();
    expect(mongoose.connection.readyState).toBe(0);
  });
});
