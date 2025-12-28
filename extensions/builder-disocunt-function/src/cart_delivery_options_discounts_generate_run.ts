import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
  DeliveryInput,
  CartDeliveryOptionsDiscountsGenerateRunResult,
} from "../generated/api";

export function cartDeliveryOptionsDiscountsGenerateRun(
  input: DeliveryInput,
): CartDeliveryOptionsDiscountsGenerateRunResult {
  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    throw new Error("No delivery groups found");
  }

  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Shipping,
  );

  if (!hasShippingDiscountClass) {
    return {operations: []};
  }

  // 3️⃣ Filter builder-only items
  const builderItems = input.cart.lines.filter(
    (line) => line.builderBundleId?.value === 'unique-pc-builder-id',
  );

  if (!builderItems.length) {
    return { operations: [] };
  }

  // 4️⃣ Parse active discount rules from shop metafield
  if (!input.shop.metafield?.value) {
    return { operations: [] };
  }

  let shippingRules: any[] = [];
  try {
    shippingRules = JSON.parse(input.shop.metafield.value);
  } catch {
    return { operations: [] };
  }

  const builderSubtotal = builderItems.reduce((sum, line) => {
    return sum + Number(line.cost.subtotalAmount.amount);
  }, 0);

  // const activeShippingRules = shippingRules.filter(
  //   (rule) => rule.status === 'active' && rule.type === 'shipping',
  // );

  const activeShippingRules = shippingRules.filter((rule) => {
    if (rule.status !== 'active' || rule.type !== 'shipping') return false;

    if (
      rule.rule_type === 'reduce_shipping' &&
      rule.condition?.subtotal_gte
    ) {
      return builderSubtotal >= rule.condition.subtotal_gte;
    }

    return false;
  });  


  if (!activeShippingRules.length) {
    return { operations: [] };
  }
  
  
  // 5️⃣ Map each rule to a candidate
  // const candidates = activeShippingRules.map((rule) => {
  //   const conditions: any[] = [];

  //   // Spend threshold condition (applies to whole order subtotal)
  //   if (rule.rule_type === 'reduce_shipping' && rule.condition?.subtotal_gte) {
  //     conditions.push({
  //       orderMinimumSubtotal: {
  //         minimumAmount: rule.condition.subtotal_gte,
  //         excludedCartLineIds: [],
  //       },
  //     });
  //   }

  //   // Determine discount value
  //   const value: any = {};
  //   if (rule.action?.discount_type === 'percentage') {
  //     value.percentage = { value: rule.action.value };
  //   } else if (rule.action?.discount_type === 'fixed') {
  //     value.fixedAmount = {
  //       amount: rule.action.value,
  //     };
  //   }

  //   const candidate: any = {
  //     message: rule.name,
  //     targets: [
  //       {
  //         orderSubtotal: {
  //           excludedCartLineIds: [],
  //         },
  //       },
  //     ],
  //     value,
  //   };

  //   if (conditions.length > 0) {
  //     candidate.conditions = conditions;
  //   }

  //   return candidate;
  // });

  return {
  operations: [
    {
      deliveryDiscountsAdd: {
        selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        candidates: activeShippingRules.map((rule) => ({
          message: rule.name,
          targets: [
            {
              deliveryGroup: {
                id: firstDeliveryGroup.id,
              },
            },
          ],
          value:
            rule.action.discount_type === "percentage"
              ? { percentage: { value: rule.action.value } }
              : { fixedAmount: { amount: rule.action.value } },
        })),
      },
    },
  ],
};


  // return {
  //   operations: [
  //     {
  //       deliveryDiscountsAdd: {
  //         candidates: [
  //           {
  //             message: "FREE DELIVERY",
  //             targets: [
  //               {
  //                 deliveryGroup: {
  //                   id: firstDeliveryGroup.id,
  //                 },
  //               },
  //             ],
  //             value: {
  //               percentage: {
  //                 value: 100,
  //               },
  //             },
  //           },
  //         ],
  //         selectionStrategy: DeliveryDiscountSelectionStrategy.All,
  //       },
  //     },
  //   ],
  // };
}