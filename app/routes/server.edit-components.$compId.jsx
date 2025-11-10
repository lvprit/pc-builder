import { json } from "@remix-run/node";
import prisma from "../db.server";

export let action = async ({ request, params }) => {  
  try {
    // Get builderId from URL params
    const componentId = parseInt(params.compId, 10); // This grabs builderId from the URL
    
    if (componentId) {
      // If componentId is provided, update the existing component
      if(request.method === 'POST'){
        const data = await request.json();

        const newComponent = await prisma.component.update({
          where: { id: parseInt(componentId, 10) }, // Find component by id
          data
        });

        return json({ message: "Component updated successfully!", component: newComponent });

      } else if(request.method === 'DELETE') {

        console.log('its delete mrth');
        
        await prisma.component.delete({
          where: {
            id: parseInt(componentId, 10), // Ensure ID is parsed as an integer
          }
        })
      return json({ message: "Builder deleted successfully" }, { status: 200 }) 
    }
    } else {
        return json({ message: "Component Id not found!" }); 
    }
    // Return success response
  } catch (error) {
    console.error('err here...', error);
    return json({ error: "Failed to create or update component" }, { status: 500 });
  }
};