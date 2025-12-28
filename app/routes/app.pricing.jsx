import { authenticate, MONTHLY_PLAN } from '../shopify.server'
import { Form, json, redirect, useLoaderData, useNavigate } from '@remix-run/react';
import {
  Box,
  Card,
  Text,
  Button,
  Badge,
  BlockStack,
  InlineStack,
  Page,
} from "@shopify/polaris";
import { useState } from 'react';


export async function loader({ request }) {
  const { billing } = await authenticate.admin(request);

  try {
    const billingCheck = await billing.require({
      plans: [MONTHLY_PLAN],
      isTest: true,
      onFailure: async () => { throw new Error('No active plan') },
    });

    const subscription = billingCheck.appSubscriptions[0];
    console.log(`SHop is on ${subscription.name} (id:${subscription.id})`);

    return json({ billing, plan: subscription });
  } catch (error) {
    if (error.message === 'No active plan') {
      console.log("Shop does not have any active plan");
      return json({ billing, plan: { name: 'free' } });
    }
    throw error;
  }
}


export async function action({ request }) {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const subscriptionId = formData.get('subscriptionId');
  const actionType = formData.get('actionType');  

  if (actionType === 'cancel' && subscriptionId) {
    
    try {
      await billing.cancel({
        subscriptionId: subscriptionId,
        isTest: true, // Use 'true' in dev, 'false' in production
        prorate: true, // Optional: prorate the final bill
      });

      // Redirect back to the pricing page to refresh the view
      return redirect("/app/pricing");

    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      // Handle error (e.g., show a toast message in the UI later)
      return json({ error: "Failed to cancel subscription" }, { status: 500 });
    }
  }

  return json({ status: "ok" });
}


function Pricing() {
  const { plan } = useLoaderData();
  const [isCancelling, setIsCancelling] = useState(false);

  // console.log(plan, 'plan here...', isCancelling);


  const currentPlan = plan?.name ?? "free";

  const pricingOptions = [
    {
      name: "free",
      title: "Free Plan",
      price: "$0 / month",
      features: [
        "Basic PC builder",
        "Limited components",
        "No advanced rules",
      ],
    },
    {
      name: "Monthly subscription",
      title: "Pro Plan",
      price: "$14.99 / month",
      features: [
        "Unlimited components",
        "Advanced PC rules",
        "Priority support",
        "Discount engine",
      ],
    },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChoosePlan = async (optionName) => {
    setIsLoading(true); // Start loading state

    // Construct the destination URL
    const destinationUrl = `/app/subscription?plan=${optionName}`;

    try {
      // Simulate asynchronous work that needs to complete before navigation,
      // such as initiating a fetch call to your billing action/loader.
      // NOTE: The billing API often handles the redirect within the loader/action itself.

      // If you are fetching data/triggering an action *before* navigating:
      // const response = await fetch(destinationUrl + '&_data', { method: 'POST' });
      // if (!response.ok) throw new Error('Failed to initiate billing');

      // Navigate to the next page where the loader handles the actual billing logic
      navigate(destinationUrl);

    } catch (error) {
      console.error("Error during plan selection:", error);
      setIsLoading(false); // Stop loading if an error occurs
      // Optionally display a Toast error message here
    }

    // In many Shopify billing flows, the navigate call above initiates a full page
    // reload/redirect via the loader/action anyway, so setIsLoading(false) might not
    // run before the browser leaves the page. The button will simply show the spinner
    // until the new page starts loading.
  };

  return (
    <Page>
      <Box padding="600">
        <Card padding="600" roundedAbove="sm" background="bg-surface">
          <BlockStack gap="600">
            <Text variant="headingLg" as="h1" fontWeight="bold">
              Pricing Plans
            </Text>

            <Text variant="bodyMd" tone="subdued" as="p">
              Choose the plan that fits your needs. Your current plan is:
              <Badge tone="success" style={{ marginLeft: 8 }}>
                {currentPlan}
              </Badge>
            </Text>

            <InlineStack gap="400" align="start">
              {pricingOptions.map((option) => {
                const isCurrent = option.name === currentPlan;

                return (
                  <Card
                    key={option.name}
                    padding="500"
                    roundedAbove="sm"
                    background={isCurrent ? "bg-surface-selected" : "bg-surface-secondary"}
                    border={isCurrent ? "highlight" : "base"}
                  >
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd">{option.title}</Text>
                        {isCurrent && <Badge tone="success">Current Plan</Badge>}
                      </InlineStack>

                      <Text variant="heading2xl" fontWeight="bold">
                        {option.price}
                      </Text>

                      <BlockStack gap="200">
                        {option.features.map((f, i) => (
                          <Text variant="bodyMd" tone="subdued" key={i}>
                            • {f}
                          </Text>
                        ))}
                      </BlockStack>

                      {!isCurrent ? option.name !== 'free' && (
                        <Button
                          variant="primary"
                          fullWidth
                          onClick={() => handleChoosePlan(option.name)}
                          loading={isLoading}
                          disabled={isLoading}
                        >
                          Choose {option.title}
                        </Button>
                      ) : (
                        <>
                          <Button fullWidth disabled>Selected</Button>

                          {isCurrent && option.name !== 'free' && (
                            <Form method="post" onSubmit={() => setIsCancelling(true)}>
                              <input type="hidden" name="subscriptionId" value={plan.id} />
                              <input type="hidden" name="actionType" value="cancel" />
                              <Button 
                                  fullWidth 
                                  tone="critical" 
                                  variant="secondary"
                                  loading={isCancelling}
                                  disabled={isCancelling}
                                  submit // This tells Polaris Button to act as a form submit button
                              >
                                  Cancel Plan
                              </Button>
                            </Form>
                          )}

                        </>
                      )}

                    </BlockStack>
                  </Card>
                );
              })}
            </InlineStack>

          </BlockStack>
        </Card>
      </Box>
    </Page>
  );
}

export default Pricing;
