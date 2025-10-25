import { json } from "@remix-run/node";
import prisma from "../db.server";

export async function action({ request }) {
  // const { session } = await authenticate.admin(request);
  const body = await request.json();
  const updatedComponents = body.components; // [{ id, order }, ...]

  console.log('api calela..asd.');
  
  try {
    await prisma.$transaction(
      updatedComponents.map((component) =>
        prisma.component.update({
          where: { id: component.id },
          data: { order: component.order },
        })
      )
    );

    return json({ success: true });
  } catch (error) {
    console.error("Bulk update failed:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
