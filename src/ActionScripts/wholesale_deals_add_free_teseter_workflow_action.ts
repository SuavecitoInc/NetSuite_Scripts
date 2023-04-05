/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as record from 'N/record';
import * as log from 'N/log';

const config: {
  [key: string]: { internalId: string; quantity: number; name: string };
} = {
  'K-P214': {
    internalId: '30402',
    quantity: 2,
    name: 'Original Hold Pomade 4 oz',
  },
  'K-P215': {
    internalId: '30403',
    quantity: 2,
    name: 'Firme (Strong) Hold Pomade 4 oz',
  },
  'K-P357': {
    internalId: '30427',
    quantity: 2,
    name: 'Matte Pomade 4 oz',
  },
  'K-P214-6': {
    internalId: '30402',
    quantity: 1,
    name: 'Original Hold Pomade 4 oz',
  },
  'K-P215-6': {
    internalId: '30403',
    quantity: 1,
    name: 'Firme (Strong) Hold Pomade 4 oz',
  },
  'K-P357-6': {
    internalId: '30427',
    quantity: 1,
    name: 'Matte Pomade 4 oz',
  },
  'K-P036': {
    internalId: '25279',
    quantity: 4,
    name: 'Premium Blends Hair Pomade 4 oz',
  },
  'K-P074': {
    internalId: '24906',
    quantity: 4,
    name: 'Premium Blends Matte Pomade 4 oz',
  },
  'K-P036-6': {
    internalId: '25279',
    quantity: 2,
    name: 'Premium Blends Hair Pomade 4 oz',
  },
  'K-P074-6': {
    internalId: '24906',
    quantity: 2,
    name: 'Premium Blends Matte Pomade 4 oz',
  },
};

const getSkuFromName = (name: string) => {
  const arr = name.split(' ');
  let isMatrix = false;
  if (arr[1] === ':') {
    isMatrix = true;
  }
  let sku = arr[0];
  if (isMatrix) {
    sku = arr[2];
  }
  return sku.trim();
};

export let onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  const salesRecord = context.newRecord;
  const configEligibleItemsList = Object.keys(config);
  log.debug({
    title: 'CONFIG ELIGIBLE ITEMS LIST',
    details: configEligibleItemsList,
  });
  // wholesale
  if (
    salesRecord.getValue('custbody_sp_fa_channel') ===
      'Shopify-WholesaleShopify' ||
    salesRecord.getValue('custbody_fa_channel') === 'Shopify-WholesaleShopify'
  ) {
    const eligibleItemsList = String(
      runtime.getCurrentScript().getParameter({
        name: 'custscript_sp_so_w_action_eligible_skus',
      })
    )
      .split(',')
      .map(el => el.trim());
    log.debug({
      title: 'ELIGIBLE ITEMS',
      details: eligibleItemsList,
    });
    // check for eligible items
    const lines = salesRecord.getLineCount({ sublistId: 'item' });
    log.debug({
      title: 'LINES',
      details: lines,
    });
    for (let i = 0; i < lines; i++) {
      const id = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_sp_item_id',
        line: i,
      });
      const qty = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        line: i,
      });
      const type = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_sp_item_type',
        line: i,
      });
      const item = salesRecord.getSublistText({
        sublistId: 'item',
        fieldId: 'item',
        line: i,
      });

      if (type === 'Kit/Package') {
        const sku = getSkuFromName(item as string);
        // log.debug({
        //   title: `CHECKING SKU ${sku}`,
        //   details: eligibleItemsList.includes(sku),
        // });

        // if (eligibleItemsList.includes(sku)) {
        //   // load record, get component and add component with eligible quantity to transaction
        //   addEligibleMemberItems(salesRecord, id, qty);
        // }

        if (configEligibleItemsList.includes(sku)) {
          // add component based on config
          addEligibleItems(sku, salesRecord, qty);
        }
      }
    }
    return true;
  }
  return false;
};

function addEligibleItems(
  sku: string,
  salesRecord: record.Record,
  qty: record.FieldValue
) {
  const freeItem = config[sku];
  const freeItemId = freeItem.internalId;
  const quantity = freeItem.quantity * Number(qty);
  const name = freeItem.name;
  log.debug({
    title: 'Item is of type Kit/Package and Eligible',
    details: `Adding ${name} x ${quantity} to order.`,
  });
  // set item, quantity, price level, price, description & tax code
  salesRecord.selectNewLine({ sublistId: 'item' });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'item',
    value: freeItemId,
    fireSlavingSync: true,
  });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'quantity',
    value: quantity,
    fireSlavingSync: true,
  });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'price',
    value: -1,
    fireSlavingSync: true,
  });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'amount',
    value: 0,
    fireSlavingSync: true,
  });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'description',
    value: `${name} - FREE Tester`,
    fireSlavingSync: true,
  });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'taxcode',
    value: -7,
    fireSlavingSync: true,
  });
  salesRecord.commitLine({ sublistId: 'item' });
}

function addEligibleMemberItems(
  salesRecord: record.Record,
  id: record.FieldValue,
  qty: record.FieldValue
) {
  log.debug({
    title: 'Item is of type Kit/Package and Eligible',
    details: 'Loading components to get SKU to add to Order',
  });
  const loadedKitPackageItem = record.load({
    type: record.Type.KIT_ITEM,
    id: Number(id),
  });
  const componentsCount = loadedKitPackageItem.getLineCount({
    sublistId: 'member',
  });
  log.debug({
    title: 'LOADED KIT/PACKAGE COMPONENTS COUNT',
    details: componentsCount,
  });
  if (componentsCount === 1) {
    const component = loadedKitPackageItem.getSublistValue({
      sublistId: 'member',
      fieldId: 'item',
      line: 0,
    });
    const componentText = loadedKitPackageItem.getSublistText({
      sublistId: 'member',
      fieldId: 'item',
      line: 0,
    });
    log.debug({
      title: 'COMPONENT',
      details: component,
    });
    // add item component to order
    // set item, quantity, price level, price, description & tax code
    salesRecord.selectNewLine({ sublistId: 'item' });
    salesRecord.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'item',
      value: component, // black comb
      fireSlavingSync: true,
    });
    salesRecord.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'quantity',
      value: qty,
      fireSlavingSync: true,
    });
    salesRecord.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'price',
      value: -1,
      fireSlavingSync: true,
    });
    salesRecord.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'amount',
      value: 0,
      fireSlavingSync: true,
    });
    salesRecord.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'description',
      value: `${componentText} - FREE Tester`,
      fireSlavingSync: true,
    });
    salesRecord.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'taxcode',
      value: -7,
      fireSlavingSync: true,
    });
    salesRecord.commitLine({ sublistId: 'item' });
  }
}
