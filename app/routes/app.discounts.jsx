// app.discounts.jsx

import { Form, json, useLoaderData } from "@remix-run/react";
import {
    Page, Layout, Card, Text, FormLayout,
    TextField, ChoiceList, Button, BlockStack,
    InlineStack, ResourceItem, ResourceList, EmptyState, Icon, Modal, Badge, ButtonGroup, Checkbox
} from "@shopify/polaris";
import { DeleteIcon, DiscountIcon, PlusIcon, StatusActiveIcon, DisabledIcon } from '@shopify/polaris-icons';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Define the namespace and key for consistency
const METIFIELD_NAMESPACE = 'pc_builder_app';
const METIFIELD_KEY = 'discount_rules';


export async function loader({request}) {
  const { session } = await authenticate.admin(request);
  try {
    const initialDiscounts = await prisma.discountRule.findMany({
      where: {
        shop: session.shop
      }
    })

    return json({data: initialDiscounts})
  } catch (error) {
    console.log("Failed to fetch discount rules", error);

    return json(
      { error: "Failed to fetch discount rules"}, 
      {status:500})
  }
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const method = request.method;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if(method !== "DELETE"){
    const required =
      body?.action?.value &&
      body?.action?.discount_type &&
      body?.name &&
      body?.rule_type &&
      body?.status &&
      body?.type;
  
    if (!required) {
      return json({ error: "All fields are required" }, { status: 400 });
    }
  }

  try {
    if (method === "POST") {
      return await createRule({ admin, session, body });
    }

    if (method === "PUT") {
      return await updateRule({ admin, session, body });
    }

    if (method === "DELETE") {
      return await deleteRule({ admin, session, body });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Discount rule action failed:", error);
    return json(
      { error: error.message || "Failed to process discount rule" },
      { status: 500 }
    );
  }
}

async function createRule({ admin, session, body }) {
  const newRule = body;

  /** ---------- Shopify automatic discount (only once) ---------- */
  const pcBuilderDicountExist = await checkDiscountCreated(admin);
  
  if (!pcBuilderDicountExist) {
    console.log('creating pc builder dicount...');
    
    const shopifyFunctionsResponse = await admin.graphql(`
      query {
        shopifyFunctions(first: 20) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `);

    const functionData = await shopifyFunctionsResponse.json();
    const functions =
      functionData?.data?.shopifyFunctions?.edges ?? [];

    const builderFn = functions.find(
      f => f.node.title === "builder-disocunt-function"
    );

    if (!builderFn) {
      throw new Error("Discount function not found");
    }

    const discountCreateResponse = await admin.graphql(
      `#graphql
      mutation discountAutomaticAppCreate(
        $automaticAppDiscount: DiscountAutomaticAppInput!
      ) {
        discountAutomaticAppCreate(
          automaticAppDiscount: $automaticAppDiscount
        ) {
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          automaticAppDiscount: {
            title: "PC Builder Automatic Discount function",
            functionId: builderFn.node.id,
            startsAt: new Date().toISOString(),
            discountClasses: ["ORDER", "SHIPPING"],
          },
        },
      }
    );

    const result = await discountCreateResponse.json();
    const errors =
      result?.data?.discountAutomaticAppCreate?.userErrors ?? [];

    if (errors.length) {
      throw new Error(errors[0].message);
    }
  }

  /** ---------- Prisma: create ---------- */
  const data = await prisma.discountRule.create({
    data: {
      shop: session.shop,
      name: newRule.name,
      status: newRule.status,
      ruleType: newRule.rule_type,
      appliesTo: newRule.type,
      minSubtotal: newRule.condition?.subtotal_gte,
      itemCount: newRule.condition?.item_count_gte,
      discountType: newRule.action.discount_type,
      discountValue: newRule.action.value,
    },
  });

  /** ---------- Metafield: append ---------- */
  const entries = await getMetafieldEntries(admin);

  entries.push({ ...newRule, id: data.id });

  await setMetafieldEntries(admin, entries);

  return json(data, { status: 201 });
}

async function updateRule({ admin, session, body }) {
  if (!body?.id) {
    return json({ error: "Rule id is required" }, { status: 400 });
  }
  
  /** ---------- Prisma: update ---------- */
  const data = await prisma.discountRule.update({
    where: {
      id: body.id,
      shop: session.shop,
    },
    data: {
      name: body.name,
      status: body.status,
      ruleType: body.rule_type,
      appliesTo: body.type,
      minSubtotal: body.condition?.subtotal_gte,
      itemCount: body.condition?.item_count_gte,
      discountType: body.action.discount_type,
      discountValue: body.action.value,
    },
  });

  /** ---------- Metafield: replace ---------- */
  const entries = await getMetafieldEntries(admin);
  const index = entries.findIndex(r => r.id === body.id);

  if (index === -1) {
    throw new Error("Rule not found in metafield");
  }

  entries[index] = body;

  await setMetafieldEntries(admin, entries);

  return json(data);
}

const checkDiscountCreated = async(admin) => {
  try {
    const funResponse = await admin.graphql(`
      query DiscountByTitle($title: String!) {
        discountNodes(
          first: 1
          query: $title
        ) {
          edges {
            node {
              id
            }
          }
        }
      }
      `,
      {
        variables: {
          "title": "title:'PC Builder Automatic Discount function'"
        }
      }
    );

    const pcBuilderDiscount = await funResponse.json();
    return pcBuilderDiscount.data?.discountNodes?.edges?.length > 0 ? true : false;
    
  } catch (error) {
    console.log(error, 'error fetching pc builder function');
    return false;
  }
}

async function deleteRule({ admin, session, body }) {
  if (!body?.id) {
    return json({ error: "Rule id is required" }, { status: 400 });
  }

  /** ---------- Prisma: update ---------- */
  const data = await prisma.discountRule.delete({
    where: {
      id: parseInt(body.id, 10),
      shop: session.shop,
    }
  });

  /** ---------- Metafield: replace ---------- */
  const entries = await getMetafieldEntries(admin);

  // entries[index] = body;
  const newEntries = entries.filter(r => r.id !== body.id);

  await setMetafieldEntries(admin, newEntries);

  return json(data);
}

async function getMetafieldEntries(admin) {
  const response = await admin.graphql(`
    query {
      shop {
        metafield(namespace: "builder", key: "pc_buidler_app") {
          value
        }
      }
    }
  `);

  const json = await response.json();
  const value = json?.data?.shop?.metafield?.value;

  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setMetafieldEntries(admin, entries) {
  const response = await admin.graphql(
    `#graphql
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors {
          message
        }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            namespace: "builder",
            key: "pc_buidler_app",
            type: "json",
            ownerId: "gid://shopify/Shop/93133603117",
            value: JSON.stringify(entries),
          },
        ],
      },
    }
  );

  const result = await response.json();
  const errors = result?.data?.metafieldsSet?.userErrors ?? [];

  if (errors.length) {
    throw new Error(errors[0].message);
  }
}


const DiscountFormModal = forwardRef(
  ({ open, onClose, onSave, initialRule, isLoading }, ref) => {
  const [ruleType, setRuleType] = useState("spend_threshold");
  const [name, setName] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [itemCount, setItemCount] = useState("");
  const [discountType, setDiscountType] = useState(["percentage"]);
  const [discountValue, setDiscountValue] = useState("");
  const [isActive, setIsActive] = useState(true);

  function resetAllStates() {
    setRuleType("spend_threshold");
    setName("");
    setSubtotal("");
    setItemCount("");
    setDiscountType(["percentage"]);
    setDiscountValue("");
    setIsActive(true);
  }

  // 👇 Expose method to parent
    useImperativeHandle(ref, () => ({
      resetAllStates,
    }));

  useEffect(() => {
    if (!initialRule) return;

    setName(initialRule.name);
    setRuleType(initialRule.rule_type);
    setIsActive(initialRule.status === "active");

    if (initialRule.condition?.subtotal_gte != null) {
      setSubtotal(String(initialRule.condition.subtotal_gte));
    }
    
    if (initialRule.condition?.item_count_gte != null) {
      setItemCount(String(initialRule.condition.item_count_gte));
    }

    if (initialRule.action?.discount_type) {
      setDiscountType([initialRule.action.discount_type]);      
      if (initialRule.action.value != null) {
        setDiscountValue(String(initialRule.action.value));
      }
    }
  }, [initialRule, open]);

  const handleSave = async () => {
    const rule = {
      id: initialRule?.id, // important
      name,
      status: isActive ? "active" : "draft",
      rule_type: ruleType,
    };

    if (ruleType === "spend_threshold") {
      rule.type = "order";
      rule.condition = { subtotal_gte: parseFloat(subtotal) };
      rule.action = {
        discount_type: discountType.includes("percentage")
          ? "percentage"
          : "fixed",
        value: parseFloat(discountValue),
      };
    }

    if (ruleType === "item_count") {
      rule.type = "order";
      rule.condition = { item_count_gte: parseInt(itemCount, 10) };
      rule.action = {
        discount_type: discountType.includes("percentage")
          ? "percentage"
          : "fixed",
        value: parseFloat(discountValue),
      };
    }

    if (ruleType === "free_shipping") {
      rule.type = "shipping";
      rule.condition = { subtotal_gte: parseFloat(subtotal) };
      rule.action = {
        discount_type: "free_shipping",
      };
    }

    if (ruleType === "reduce_shipping") {
      rule.type = "shipping";
      rule.condition = { subtotal_gte: parseFloat(subtotal) };
      rule.action = {
        discount_type: discountType.includes("percentage")
          ? "percentage"
          : "fixed",
        value: parseFloat(discountValue),
      };
    }

    await onSave(rule);
    onClose();
    resetAllStates();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      // title="Create New Discount Rule"
      title={initialRule ? "Edit Discount Rule" : "Create New Discount Rule"}
      primaryAction={{
        content: "Save Rule",
        onAction: handleSave,
        disabled: !name || !discountValue || isLoading,
        loading: isLoading
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <FormLayout>

          {/* Rule Name */}
          <TextField
            label="Rule Name"
            value={name}
            onChange={setName}
            requiredIndicator
          />

          {/* RULE TYPE SELECTOR */}
          <ChoiceList
            title="Rule Type"
            selected={[ruleType]}
            onChange={vals => setRuleType(vals[0])}
            choices={[
              { label: "Order — Spend Threshold", value: "spend_threshold" },
              { label: "Order — Item Count", value: "item_count" },
              // { label: "Shipping — Free Shipping Threshold", value: "free_shipping" },
              { label: "Shipping — Reduce Shipping Cost", value: "reduce_shipping" },
            ]}
          />

          {/* CONDITIONAL FIELDS */}

          {(ruleType === "spend_threshold" ||
            ruleType === "free_shipping" ||
            ruleType === "reduce_shipping") && (
            <TextField
              label="Minimum Subtotal ($)"
              value={subtotal}
              type="number"
              onChange={setSubtotal}
              min={0}
              requiredIndicator
            />
          )}

          {ruleType === "item_count" && (
            <TextField
              label="Minimum Item Count"
              type="number"
              value={itemCount}
              onChange={setItemCount}
              requiredIndicator
              min={0}
            />
          )}

          {(ruleType === "spend_threshold" ||
            ruleType === "item_count" ||
            ruleType === "reduce_shipping") && (
            <>
              <ChoiceList
                title="Discount Type"
                selected={discountType}
                onChange={setDiscountType}
                choices={[
                  { label: "Percentage", value: "percentage" },
                  { label: "Fixed Amount", value: "fixed" },
                ]}
              />

              <TextField
                label="Discount Value"
                type="number"
                value={discountValue}
                onChange={setDiscountValue}
                prefix={discountType.includes("percentage") ? "%" : "$"}
                requiredIndicator
                min={0}
              />
            </>
          )}

          <Checkbox
            label="Activate rule immediately"
            checked={isActive}
            onChange={setIsActive}
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
})

// const initialDiscountsData = [
//   {
//     id: "dsc-001",
//     name: "10% off orders over $100",
//     status: "active",
//     rule_type: "spend_threshold",
//     type: "order",
//     condition: {
//       subtotal_gte: 100,
//     },
//     action: {
//       discount_type: "percentage",
//       value: 10,
//     },
//   },
//   {
//     id: "dsc-002",
//     name: "$15 off when buying 3+ items",
//     status: "draft",
//     rule_type: "item_count",
//     type: "order",
//     condition: {
//       item_count_gte: 3,
//     },
//     action: {
//       discount_type: "fixed",
//       value: 15,
//     },
//   },
// ];

function normalizeDiscount(disc) {
  const discountObj = {
    id: disc.id,
    name: disc.name,
    status: disc.status,
    rule_type: disc.ruleType,
    type: disc.appliesTo,
    condition: {},
    action: {
      discount_type: disc.discountType,
      value: disc.discountValue,
    },
  };

  if (disc.itemCount) {
    discountObj.condition.item_count_gte = disc.itemCount;
  }  

  if (disc.minSubtotal) {
    discountObj.condition.subtotal_gte = disc.minSubtotal;
  }

  return discountObj;
}


function DiscountBuilderUI() {
  const initialDiscounts = useLoaderData();
  const initialDiscountsData =
    initialDiscounts?.data?.length > 0
      ? initialDiscounts.data.map(normalizeDiscount)
      : [];

  const [discounts, setDiscounts] = useState(initialDiscountsData);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDiscountId, setSelectedDiscountId] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const discountModalRef = useRef(null);  

  const openDeleteModal = async (id) => {
    setSelectedDiscountId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/app/discounts/?_data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({id: selectedDiscountId})
      })

      if (!response.ok) {
      let message = "Something went wrong";

      try {
        const data = await response.json();
        message = data?.error || message;
      } catch {
        // ignore JSON parse errors
      }

      shopify.toast.show(message, { isError: true });
      return; // ❌ stop here — no state updates
    }
    
      shopify.toast.show("Discount removed successfully");
      setDiscounts(discounts.filter(d => d.id !== selectedDiscountId));
      setIsDeleteModalOpen(false);

    } catch (error) {
      console.error("Network error:", error);
      shopify.toast.show("Network error. Please try again", { isError: true });
    } finally {
      setIsLoading(false);
    }
    
  };

  const handleSaveNewRule = async (ruleData) => {
  setIsLoading(true);

  try {
    const isEdit = Boolean(ruleData.id);

    const response = await fetch(`/app/discounts/?_data`, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit
          ? ruleData
          : {
              ...ruleData,
              isFirstDiscountRule: discounts.length === 0,
            }
      ),
    });

    if (!response.ok) {
      let message = "Something went wrong";

      try {
        const data = await response.json();
        message = data?.error || message;
      } catch {
        // ignore JSON parse errors
      }

      shopify.toast.show(message, { isError: true });
      return; // ❌ stop here — no state updates
    }

    const savedRule = normalizeDiscount(await response.json());

    setDiscounts(prev =>
      isEdit
        ? prev.map(r => (r.id === savedRule.id ? savedRule : r))
        : [...prev, savedRule]
    );

    setEditingRule(null);

    shopify.toast.show("Discount Operation Performed Succesfully");

  } catch (error) {
    console.error("Network error:", error);
    shopify.toast.show("Network error. Please try again", { isError: true });
  } finally {
    setIsLoading(false);
  }
};

  const toggleStatus = (id) => {
    setDiscounts(discounts.map(d =>
      d.id === id
        ? { ...d, status: d.status === "active" ? "draft" : "active" }
        : d
    ));
  };

  const getConditionLabel = (rule) => {
  if (!rule?.condition) return "No condition";

  if (rule.condition.subtotal_gte != null) {
    return `Subtotal ≥ $${rule.condition.subtotal_gte}`;
  }

  if (rule.condition.item_count_gte != null) {
    return `Items ≥ ${rule.condition.item_count_gte}`;
  }

  return "Always applies";
};

const getScopeLabel = (rule) => {
  if (rule.type === "shipping") return "Shipping discount";
  return "Order discount";
};

  const getActionLabel = (rule) => {
    const { discount_type, value } = rule.action;

    if (discount_type === "free_shipping") {
      return "Free shipping";
    }

    if (discount_type === "percentage") {
      return `${value}% off`;
    }

    if (discount_type === "fixed") {
      return `$${value} off`;
    }

    return "";
  };

  function addDiscountHandler() {
    setEditingRule(null);
    // resetAllStates();
    discountModalRef.current?.resetAllStates()
    setIsFormModalOpen(true)
  }

  return (
    <Page
      title="Manage Builder Discounts"
      primaryAction={{
        content: "Add Discount",
        onAction: () => addDiscountHandler(),
        icon: PlusIcon,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card title="Existing Discount Rules">
            {discounts.length > 0 ? (
              <ResourceList
                showHeader
                items={discounts}
                renderItem={(rule) => {
                  const isActive = rule.status === "active";

                  return (
                    <ResourceItem id={rule.id} 
                        onClick={() => {
                          setEditingRule(rule);
                          setIsFormModalOpen(true);
                        }}
                      >
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <Icon source={DiscountIcon} tone="base" />
                          <BlockStack>
                            <Text variant="bodyMd" fontWeight="bold">
                              {rule.name}
                            </Text>
                            {/* <Text variant="bodySm" tone="subdued">
                              {getConditionLabel(rule)} · {getActionLabel(rule)}
                            </Text> */}
                            <Text variant="bodySm" tone="subdued">
                              {getScopeLabel(rule)} · {getConditionLabel(rule)} · {getActionLabel(rule)}
                            </Text>

                          </BlockStack>
                        </InlineStack>

                        <InlineStack gap="300">
                          <Badge tone={rule.type === "shipping" ? "attention" : "info"}>
                            {rule.type === "shipping" ? "Shipping" : "Order"}
                          </Badge>
                          
                          <Badge tone={isActive ? "success" : "info"}>
                            {isActive ? "Active" : "Draft"}
                          </Badge>

                          <ButtonGroup>
                            {/* <Button
                              variant="secondary"
                              icon={isActive ? DisabledIcon : StatusActiveIcon}
                              onClick={() => toggleStatus(rule.id)}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </Button> */}

                            <Button
                              icon={DeleteIcon}
                              tone="critical"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteModal(rule.id);
                                }}
                              />
                          </ButtonGroup>
                        </InlineStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            ) : (
              <EmptyState
                heading="No discount rules found"
                imageContained
                image="cdn.shopify.com"
              >
                <p>Click "Add Discount" to create your first rule.</p>
                <Button
                  variant="primary"
                  icon={PlusIcon}
                  onClick={() => setIsFormModalOpen(true)}
                >
                  Add Discount
                </Button>
              </EmptyState>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      <DiscountFormModal
        ref={discountModalRef}
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveNewRule}
        initialRule={editingRule}
        isLoading={isLoading}
      />

      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        primaryAction={{
          content: "Delete Rule",
          tone: "critical",
          onAction: confirmDelete,
          loading: isLoading,
          disabled: isLoading
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setIsDeleteModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <Text variant="bodyMd">
            Are you sure you want to delete this discount rule?
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default DiscountBuilderUI;
