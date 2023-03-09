import * as functions from "firebase-functions";
import { adminDb } from "./firebaseAdmin";
import * as admin from "firebase-admin";
// import admin = require("firebase-admin");

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

const fetchResults: any = async (id: string) => {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const res = await fetch(`https://api.brightdata.com/dca/dataset?id=${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await res.json();
  if (data.status === "building" || data.status === "collecting") {
    console.log("Not complete yet, Trying Again...");
    return fetchResults(id);
  }
  return data;
};

export const onScraperComplete = functions.https.onRequest(
  async (request, response) => {
    console.log("SCRAPE COMPLETE  >>> : ", request.body);

    const { success, id } = request.body;

    if (!success) {
      await adminDb.collection("searches").doc(id).set(
        {
          status: "error",
          updatedAt: admin.firestore.Timestamp.now(),
        },
        {
          merge: true,
        }
      );
    }

    const data = await fetchResults(id);

    await adminDb.collection("searches").doc(id).set(
      {
        status: "complete",
        updatedAt: admin.firestore.Timestamp.now(),
        results: data,
      },
      {
        merge: true,
      }
    );

    // functions.logger.info("Hello logs!", { structuredData: true });
    response.send("Scraping Function Finished!");
  }
);
