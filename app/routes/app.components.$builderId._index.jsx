
import { useState } from "react"
import {
  Card,
  Page,
  Text,
  Box,
  Button,
  Modal,
  FormLayout,
  TextField,
  InlineStack,
} from "@shopify/polaris"
import { json } from "@remix-run/node"

import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from '@shopify/polaris-icons'
import { useLoaderData, useNavigate, useParams } from "@remix-run/react"
import SortableIndexTable from "../components/SortableIndexTable"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"
import ShopifyToast from "../components/ShopifyToast"
import ConfirmationModal from "../components/ConfirmationModal"
import TopBarComponent from "../components/TopBarComponent"
import { fetchBuilderComponents } from '../helper/getComponents'

export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  const builderId = parseInt(params.builderId, 10);
  
  try {
    const components = await fetchBuilderComponents(session.shop, builderId);
    return json({ components });
  } catch (error) {
    console.error('Error fetching components:', error);

    // Return an error response
    return new Response(
      JSON.stringify({ message: 'Failed to fetch components', error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500, // Internal server error
      }
    );
  }
}

// Action function to handle form submission
export let action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);  

  try {
    // Get builderId from URL params
    const builderId = parseInt(params.builderId, 10); // This grabs builderId from the URL

      const data = await request.json();
      // If no componentId is provided, create a new component
      const newComponent = await prisma.component.create({
        data: {
          builderId, // Use builderId from URL
          name: data.name,
          shopId: session.shop,
        },
      });
  
      // Return success response
      return json({ message: "Component created successfully!", component: newComponent });

  } catch (error) {
    console.error('err here...', error);
    return json({ error: "Failed to create or update component" }, { status: 500 });
  }
};


export default function ComponentManagement({ onManageCompatibility }) {
  const navigate = useNavigate();
  const { builderId } = useParams();
  const componentsData = useLoaderData();
  const [toast, setToast] = useState({ content: '', isError: false, visible: false });

  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [CompConfDetail, setCompConfDetail] = useState({
    id: "",
    name: ""
  })

  const [components, setComponents] = useState(componentsData?.components || []);

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBuilder, setEditingBuilder] = useState(null)
  const [componentName, setComponentName] = useState(null);
  const [isLaoding, setIsLoading] = useState(false);

  // Function to handle the new sort order
  const handleOrderChange = async (newOrder) => {
    setComponents(newOrder);
    if(newOrder) {
      const componentsOrder = newOrder.map((itm, indx) => ({ id:itm.id, order:indx }));
      console.log(componentsOrder, 'comiei');
      try {
        const resp = await fetch("/server/update-order-components?_data", {
          method: 'POST',
          headers: {
            "Content-Type": "application/json", // Specify JSON content type
          },
          body: JSON.stringify({ components: componentsOrder })
        })

        if(resp.ok){
          showToast("Component order has been updated successfully")
        }

      } catch (error) {
          showToast("Something went wrong!", true);
      }
    }
  };

  const handleSubmit = async () => {
    // event.preventDefault();

    if (!componentName) {
      showToast("Component name is required", true)
      return;
    }

    const headers = {
      "Content-Type": "application/json", // Specify JSON content type
    }

    const data = {
      name : componentName
    }

    setIsLoading(true);
    // Send the data as JSON to the backend
    try {

      let response;

      if (editingBuilder) {
        response = await fetch(`/server/edit-components/${editingBuilder}?_data`, {
          method: "POST",
          headers,
          body: JSON.stringify(data), // Stringify the JavaScript object
        });
      } else {
        response = await fetch(`/app/components/${builderId}?_data`, {
          method: "POST",
          headers,
          body: JSON.stringify(data), // Stringify the JavaScript object
        });
      }

      const result = await response.json();

      if (response.ok) {
        setIsModalOpen(false);
        setComponentName(null);

        const newComponent = result.component;
        setComponents((prev) => {
          const compIndx = prev.findIndex(itm => itm.id === newComponent.id);
          if(compIndx !== -1){
            // update the existing object as this means the object exist with same id
            return prev?.map((comp, index)=>{
              return compIndx === index ? {...comp, ...newComponent} : comp
            })
          }
          return [...prev, newComponent]
        }
        );

        showToast(result.message)
      } else {
        showToast(result.error || "Something went wrong!", true)
      }

    } catch (error) {
        showToast(error?.message || "Something went wrong!", true)
    } finally {
      setIsModalOpen(false);
      setIsLoading(false);
    }
  };

   const handleDelete = async (id) => {
    setIsLoading(true);
    try {
      // Send a DELETE request to the /app/builders route
      const response = await fetch(`/server/edit-components/${id}?_data`, {
        method: "DELETE",  // Specify DELETE method here
      });

      const result = await response.json();

      if (response.ok) {
        showToast(result.message, false);  // Show success toast
        // Remove the builder from the state (table) after successful delete
        setComponents(components.filter((comp) => comp.id !== id));
        setIsConfirmationModalOpen(false);
      } else {
        showToast(result.error || "Failed to delete builder.", true);  // Show error toast
      }
    } catch (error) {
      console.log(error);
      showToast("Something went wrong, please try again.", true);  // Show generic error toast
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (content, isError) => {
    setToast({ content, isError, visible: true });

    // Hide toast after a short delay
    setTimeout(() => setToast({ ...toast, visible: false }), 4000);
  };

  const editCompnenthanlder = (componentId, compName) => {
    setEditingBuilder(componentId);
    setComponentName(compName);
    setIsModalOpen(true);
  }

  const showDeleteModalHander = (id, name) => {
    setCompConfDetail({id, name})
    setIsConfirmationModalOpen(true);
  }

  return (
    <Page>
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack blockAlign="center" gap="200">
            {/* <Button onClick={() => navigate('/app')} icon={ArrowLeftIcon}> */}
            <ArrowLeftIcon onClick={() => navigate('/app')} height={24} cursor={'pointer'}>
              Back
            </ArrowLeftIcon>
            {/* </Button> */}
            <Text variant="headingLg" as="h2" fontWeight="bold">
              Component Management
            </Text>
          </InlineStack>
          {/* <Button icon={ArrowRightIcon} variant="primary">Add Compatibility</Button> */}
          <Box paddingBlock="400">
            <Button onClick={() => {
              setEditingBuilder(null)
              setIsModalOpen(true)
            }
            } variant="primary" icon={PlusIcon}>
              Add Component
            </Button>
          </Box>
        </InlineStack>
      <TopBarComponent builderId={builderId} />
      

      {/* Main Content Section */}
      <Card>
        <SortableIndexTable
          components={components}
          setCompnents={setComponents}
          onOrderChange={handleOrderChange}
          editCompnenthanlder={editCompnenthanlder}
          showToast={showToast}
          showDeleteModalHander={showDeleteModalHander}
        />
      </Card>

      {/* Modal for creating or editing a builder */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBuilder ? "Edit Component" : "Create Component"}
        primaryAction={{
          content: editingBuilder ? "Update Component" : "Create Component",
          onAction: handleSubmit,
          loading: isLaoding
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Component Name"
              placeholder="CASE, CPU, MOTHERBOARD"
              value={componentName}
              onChange={(value) => setComponentName(value)}
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
      <ShopifyToast toast={toast} setToast={setToast}/>
      <ConfirmationModal
        active={isConfirmationModalOpen}
        handleClose={() => setIsConfirmationModalOpen(false)}
        loading={isLaoding}
        confirmDelete={handleDelete}
        builderDetail={CompConfDetail}
      />
    </Page>
  );

}