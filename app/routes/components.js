import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // adjust if your path differs
import { fetchBuilderComponents } from "../helper/getComponents";

export const loader = async ({ request }) => {
  try {

    const url = new URL(request.url);
    const shopId = url.searchParams.get("shop") || null;
    const builderId = url.searchParams.get("builder_id") || null;

    console.log(shopId, builderId, 'da..eo');
    

    const { admin } = await authenticate.public.appProxy(request);
    console.log(admin, 'admin here...');
    

    const components = await fetchBuilderComponents(shopId, parseInt(builderId, 10));

    // ✅ Step 4: Return JSON
    return json({
      components,
    });
  } catch (error) {
    console.error("❌ Failed to fetch components:", error);
    return json(
      { error: "Failed to fetch components", details: String(error) },
      { status: 500 }
    );
  }
};
