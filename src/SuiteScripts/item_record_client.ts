/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';

export let pageInit: EntryPoints.Client.pageInit = (
  context: EntryPoints.Client.pageInitContext
) => {
  const currentRecord = context.currentRecord;
  const nbcUnversalAssetList = currentRecord.getField({
    fieldId: 'custitem_sp_nbc_universal_assets',
  });
  nbcUnversalAssetList.isDisplay = false;
};

export let fieldChanged: EntryPoints.Client.fieldChanged = (
  context: EntryPoints.Client.fieldChangedContext
) => {
  const currentRecord = context.currentRecord;
  const nbcUnversalAssetList = currentRecord.getField({
    fieldId: 'custitem_sp_nbc_universal_assets',
  });
  const fieldName = context.fieldId;
  if (fieldName === 'custitem_sp_licensed_from') {
    var licensee = currentRecord.getValue('custitem_sp_licensed_from');
    if (licensee === '1') {
      nbcUnversalAssetList.isDisplay = true;
    } else {
      nbcUnversalAssetList.isDisplay = false;
    }
  }
};
