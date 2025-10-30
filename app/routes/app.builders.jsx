
import { useState } from "react"
import {
  Card,
  Page,
  Text,
  Box,
  Button,
  Badge,
  Modal,
  FormLayout,
  TextField,
  IndexTable,
  useIndexResourceState,
  InlineStack,
} from "@shopify/polaris"
import {
  ArrowRightIcon,
  DeleteIcon,
  EditIcon,
  PlusIcon,
  SettingsIcon
} from '@shopify/polaris-icons';
import { json } from "@remix-run/node"
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react"
import prisma from "../db.server"
import { authenticate } from "../shopify.server"
import ShopifyToast from "../components/ShopifyToast"
import ConfirmationModal from "../components/ConfirmationModal"

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  try {
    // Fetch all builders from the database
    const builders = await prisma.builder.findMany({
      where: {
        shopId: session.shop
      }
    });

    // Return the data as JSON
    return json(builders);
  } catch (error) {
    console.error('Error fetching builders:', error);

    // Return an error response
    return new Response(
      JSON.stringify({ message: 'Failed to fetch builders', error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500, // Internal server error
      }
    );
  }
}

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

export default function BuilderManagement() {
  const buildersData = useLoaderData();
  const [toast, setToast] = useState({ content: '', isError: false, visible: false });

  const navigate = useNavigate();
  const fetcher = useFetcher();  // Declare fetcher

  const onManageCompatibility = () => { }

  const onSelectBuilder = (id) => {
    console.log('my fn called...');
    navigate("/app/components/"+ id)
  }

  const [builders, setBuilders] = useState(buildersData || []);

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [builderConfDetail, setBuilderConfDetail] = useState({
    id: "",
    name: ""
  })
  const [editingBuilder, setEditingBuilder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    builderId: ""
  })

  const handleSubmit = async () => {

    if (!formData.name || !formData.category) {
      showToast('Name and category are required', true);
      return;
    }

    setLoading(true);

    try {
      // Perform the form submission (Insert into DB)
      const response = await fetch("/app/builders?_data", {
        method: "POST",  // Use POST to trigger the action
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name: formData.name,
          category: formData.category,
          action: editingBuilder ? 'update' : 'create',
          builder_id: formData?.builderId
        }),
      });

      if (response.ok) {
        // After successful insertion, close the modal and clear form
        setIsModalOpen(false);
        setFormData({ name: "", category: "" });

        // Optionally fetch the updated list of builders
        const newBuilder = await response.json();

        // setBuilders((prev) => [...prev, newBuilder]);
        setBuilders((prev) => {
          const builderIndx = prev.findIndex(builder => builder.id === newBuilder.id);
          if(builderIndx !== -1){
            // update the existing object as this means the object exist with same id
            return prev?.map((builder, index)=>{
              return builderIndx === index ? {...builder, ...newBuilder} : builder
            })
          }
          return [...prev, newBuilder]
        }
        );

        showToast('Builder added successfully!', false);  // Success Toast

      } else {
        const result = await response.json();
        showToast(result.error || "Something went wrong!", true);  // Error Toast
      }
    } catch (error) {
      showToast('Som  ething went wrong, please try again.', true);  // Error Toast
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (builder) => {
    setEditingBuilder(builder)
    if(builder){
      setFormData({
        name: builder.name,
        category: builder.category,
        builderId: builder.id
      })
    }else{
      setFormData({
        name: '',
        category: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      // Send a DELETE request to the /app/builders route
      const response = await fetch("/app/builders?_data", {
        method: "DELETE",  // Specify DELETE method here
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",  // Ensure proper content type
        },
        body: new URLSearchParams({
          builder_id: id,  // Pass the builder ID to be deleted
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast(result.success, false);  // Show success toast
        // Remove the builder from the state (table) after successful delete
        setBuilders(builders.filter((builder) => builder.id !== id));
        setIsConfirmationModalOpen(false);
      } else {
        showToast(result.error || "Failed to delete builder.", true);  // Show error toast
      }
    } catch (error) {
      console.log(error);
      showToast("Something went wrong, please try again.", true);  // Show generic error toast
    } finally {
      setLoading(false);
    }
  };

  const resourceName = {
    singular: "builder",
    plural: "builders",
  }

  // const { selectedResources, allResourcesSelected, handleSelectionChange } =
  //   useIndexResourceState(builders)

  const showToast = (content, isError) => {
    setToast({ content, isError, visible: true });

    // Hide toast after a short delay
    setTimeout(() => setToast({ ...toast, visible: false }), 4000);
  };

  return (
    <Page>
      <Text variant="headingLg" as="h2" fontWeight="bold">
        Builder Management
      </Text>
      <InlineStack paddingBlock="400" align="space-between" blockAlign="center">
        <Text variant="bodyMd" as="p" tone="subdued">
          Create and manage PC builders. Click on a builder to add components.
        </Text>
        <Box paddingBlock="400">
          <Button onClick={()=>handleEdit(false)} variant="primary" icon={PlusIcon}>
            Add Builder
          </Button>
        </Box>
      </InlineStack>


      <Card>
        <IndexTable
          resourceName={resourceName}
          itemCount={builders.length}
          selectable={false}   // 👈 disables checkboxes
          // selectedItemsCount={
          //   allResourcesSelected ? "All" : selectedResources.length
          // }
          // onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Name" },
            // { title: "Brand" },
            { title: "Category" },
            { title: "Components" },
            { title: "Status" },
            { title: "Created" },
            { title: "Actions" },
          ]}
        >
          {builders.map((builder, index) => (
            <IndexTable.Row
              id={builder.id}
              key={builder.id}
              // selected={selectedResources.includes(builder.id)}
              position={index}
            >
              <IndexTable.Cell>
                <Text as="span" variant="bodyMd" fontWeight="bold">
                  {builder.name}
                </Text>
              </IndexTable.Cell>
              {/* <IndexTable.Cell>{builder.brand}</IndexTable.Cell> */}
              <IndexTable.Cell>{builder.category}</IndexTable.Cell>
              <IndexTable.Cell>
                <Badge>{builder.components} components</Badge>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Badge tone={builder.status === "active" ? "success" : "critical"}>
                  {builder.status}
                </Badge>
              </IndexTable.Cell>
              <IndexTable.Cell>{new Date(builder.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
              })}
            </IndexTable.Cell>
              <IndexTable.Cell>
                <InlineStack wrap={false} gap={150}>
                  <Button onClick={(e) => {
                    e.stopPropagation();
                    onSelectBuilder(builder.id)
                  }}
                  icon={ArrowRightIcon}
                  >
                    Components
                  </Button>
                  <Button onClick={() => onManageCompatibility(builder.id)} icon={SettingsIcon}>
                    Compatibility
                  </Button>
                  <Button onClick={() => handleEdit(builder)} icon={EditIcon}></Button>
                  <Button onClick={() => {
                    setBuilderConfDetail({ id: builder.id, name: builder.name })
                    setIsConfirmationModalOpen(true)
                  }}
                    destructive
                    icon={DeleteIcon}
                    >
                    {/* <InlineStack align="center">
                      <DeleteIcon height={18} />
                    </InlineStack> */}
                  </Button>
                </InlineStack>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBuilder ? "Edit Builder" : "Create Builder"}
        primaryAction={{
          content: editingBuilder ? "Update Builder" : "Create Builder",
          onAction: handleSubmit,
          disabled: loading,
          loading
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
              label="Builder Name"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              autoComplete="off"
            />
            <TextField
              label="Category"
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      <ShopifyToast toast={toast} setToast={setToast} />
      <ConfirmationModal
        active={isConfirmationModalOpen}
        handleClose={() => setIsConfirmationModalOpen(false)}
        loading={loading}
        confirmDelete={handleDelete}
        builderDetail={builderConfDetail}
      />
    </Page>
  )
}

// routes/
// │
// ├── app.builders.jsx          ← parent route (layout, shared loader/action if needed)
// │
// └── app.builders/
//     ├── _index.jsx            ← default page (your current Builder Management UI)
//     ├── $builderId.components.jsx
//     └── $builderId.compatibility.jsx