import { json } from "@remix-run/react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  const formData = new URLSearchParams(await request.text());
  const { session } = await authenticate.admin(request);
  
  if (request.method === 'POST') {
    const name = formData.get("name");
    const category = formData.get("category");
    const action = formData.get("action");
    const builderId = formData.get("builder_id")

    if (!name || !category) {
      return json({ error: "All fields are required" }, { status: 400 });
    }

    try {
      let newBuilder;
      if(action === 'create') {
        newBuilder = await prisma.builder.create({
          data: {
            name,
            category,
            shopId: session.shop,
            status: "active",
          },
        });
      } else {
         newBuilder = await prisma.builder.update({
          where: {
            id: Number(builderId)
          },
          data: {
            name,
            category,
            shopId: session.shop,
            status: "active",
          },
        });
      }

      return json(newBuilder, { status: 200 });
    } catch (error) {
      console.error("Error inserting builder:", error);
      return json({ error: "Something went wrong" }, { status: 500 });
    }
  } else if (request.method === 'DELETE') {

    const builderId = formData.get("builder_id");

    if (!builderId) {
      return json({ error: "Builder id is required" }, { status: 400 })
    }

    try {
      await prisma.builder.delete({
        where: {
          id: parseInt(builderId, 10), // Ensure ID is parsed as an integer
        }
      })

      return json({ success: "Builder deleted successfully" }, { status: 200 })
    } catch (error) {
      console.log("Error deleting builder", error);
      return json({ error: "Failed to delete builder", details: error.message }, { status: 500 });
    }
  }

}