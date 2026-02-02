const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'studio',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const createBeneficiaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateBeneficiary', inputVars);
}
createBeneficiaryRef.operationName = 'CreateBeneficiary';
exports.createBeneficiaryRef = createBeneficiaryRef;

exports.createBeneficiary = function createBeneficiary(dcOrVars, vars) {
  return executeMutation(createBeneficiaryRef(dcOrVars, vars));
};

const listDonationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDonations');
}
listDonationsRef.operationName = 'ListDonations';
exports.listDonationsRef = listDonationsRef;

exports.listDonations = function listDonations(dc) {
  return executeQuery(listDonationsRef(dc));
};

const allocateFundsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AllocateFunds', inputVars);
}
allocateFundsRef.operationName = 'AllocateFunds';
exports.allocateFundsRef = allocateFundsRef;

exports.allocateFunds = function allocateFunds(dcOrVars, vars) {
  return executeMutation(allocateFundsRef(dcOrVars, vars));
};

const getUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUser', inputVars);
}
getUserRef.operationName = 'GetUser';
exports.getUserRef = getUserRef;

exports.getUser = function getUser(dcOrVars, vars) {
  return executeQuery(getUserRef(dcOrVars, vars));
};
