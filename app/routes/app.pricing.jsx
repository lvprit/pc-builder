import { Box, Button } from '@shopify/polaris'
import React from 'react'
import { authenticate, MONTHLY_PLAN } from '../shopify.server'
import { json, useLoaderData } from '@remix-run/react';

export async function loader({ request }) {
  const { billing } = await authenticate.admin(request);

  try {
    const billingCheck = await billing.require({
      plans: [MONTHLY_PLAN],
      isTest: true,
      onFailure: async () => { throw new Error('No active plan')},
    });

    const subscription = billingCheck.appSubscriptions[0];
    console.log(`SHop is on ${subscription.name} (id:${subscription.id})`);
    
    return json({ billing, plan : subscription});
  } catch (error) {
    if(error.message === 'No active plan'){
      console.log("Shop does not have any active plan");
      return json({billing, plan: { name : 'free'} });
    }
    throw error;
  }
}

function Pricing() {
  const { plan } = useLoaderData();
  console.log(plan, 'plan here..');
  
  return (
    <Box>
        <Button variant='primary' url='/app/subscription'>Update to pro</Button>
    </Box>
  )
}

export default Pricing
