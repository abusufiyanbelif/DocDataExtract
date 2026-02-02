# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListDonations*](#listdonations)
  - [*GetUser*](#getuser)
- [**Mutations**](#mutations)
  - [*CreateBeneficiary*](#createbeneficiary)
  - [*AllocateFunds*](#allocatefunds)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListDonations
You can execute the `ListDonations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listDonations(): QueryPromise<ListDonationsData, undefined>;

interface ListDonationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDonationsData, undefined>;
}
export const listDonationsRef: ListDonationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDonations(dc: DataConnect): QueryPromise<ListDonationsData, undefined>;

interface ListDonationsRef {
  ...
  (dc: DataConnect): QueryRef<ListDonationsData, undefined>;
}
export const listDonationsRef: ListDonationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDonationsRef:
```typescript
const name = listDonationsRef.operationName;
console.log(name);
```

### Variables
The `ListDonations` query has no variables.
### Return Type
Recall that executing the `ListDonations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDonationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDonationsData {
  donations: ({
    id: UUIDString;
    amount: number;
    currency: string;
    donationDate: DateString;
    donorEmail?: string | null;
    donorName?: string | null;
    notes?: string | null;
    paymentMethod?: string | null;
  } & Donation_Key)[];
}
```
### Using `ListDonations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDonations } from '@dataconnect/generated';


// Call the `listDonations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDonations();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDonations(dataConnect);

console.log(data.donations);

// Or, you can use the `Promise` API.
listDonations().then((response) => {
  const data = response.data;
  console.log(data.donations);
});
```

### Using `ListDonations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDonationsRef } from '@dataconnect/generated';


// Call the `listDonationsRef()` function to get a reference to the query.
const ref = listDonationsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDonationsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.donations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.donations);
});
```

## GetUser
You can execute the `GetUser` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUser(vars: GetUserVariables): QueryPromise<GetUserData, GetUserVariables>;

interface GetUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserVariables): QueryRef<GetUserData, GetUserVariables>;
}
export const getUserRef: GetUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUser(dc: DataConnect, vars: GetUserVariables): QueryPromise<GetUserData, GetUserVariables>;

interface GetUserRef {
  ...
  (dc: DataConnect, vars: GetUserVariables): QueryRef<GetUserData, GetUserVariables>;
}
export const getUserRef: GetUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserRef:
```typescript
const name = getUserRef.operationName;
console.log(name);
```

### Variables
The `GetUser` query requires an argument of type `GetUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetUser` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserData {
  user?: {
    id: UUIDString;
    username: string;
    email: string;
    role?: string | null;
  } & User_Key;
}
```
### Using `GetUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUser, GetUserVariables } from '@dataconnect/generated';

// The `GetUser` query requires an argument of type `GetUserVariables`:
const getUserVars: GetUserVariables = {
  id: ..., 
};

// Call the `getUser()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUser(getUserVars);
// Variables can be defined inline as well.
const { data } = await getUser({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUser(dataConnect, getUserVars);

console.log(data.user);

// Or, you can use the `Promise` API.
getUser(getUserVars).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetUser`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserRef, GetUserVariables } from '@dataconnect/generated';

// The `GetUser` query requires an argument of type `GetUserVariables`:
const getUserVars: GetUserVariables = {
  id: ..., 
};

// Call the `getUserRef()` function to get a reference to the query.
const ref = getUserRef(getUserVars);
// Variables can be defined inline as well.
const ref = getUserRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserRef(dataConnect, getUserVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateBeneficiary
You can execute the `CreateBeneficiary` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createBeneficiary(vars: CreateBeneficiaryVariables): MutationPromise<CreateBeneficiaryData, CreateBeneficiaryVariables>;

interface CreateBeneficiaryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateBeneficiaryVariables): MutationRef<CreateBeneficiaryData, CreateBeneficiaryVariables>;
}
export const createBeneficiaryRef: CreateBeneficiaryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createBeneficiary(dc: DataConnect, vars: CreateBeneficiaryVariables): MutationPromise<CreateBeneficiaryData, CreateBeneficiaryVariables>;

interface CreateBeneficiaryRef {
  ...
  (dc: DataConnect, vars: CreateBeneficiaryVariables): MutationRef<CreateBeneficiaryData, CreateBeneficiaryVariables>;
}
export const createBeneficiaryRef: CreateBeneficiaryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createBeneficiaryRef:
```typescript
const name = createBeneficiaryRef.operationName;
console.log(name);
```

### Variables
The `CreateBeneficiary` mutation requires an argument of type `CreateBeneficiaryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateBeneficiaryVariables {
  name: string;
  createdAt: TimestampString;
  bankDetails?: string | null;
  contactInfo?: string | null;
  description?: string | null;
  status?: string | null;
}
```
### Return Type
Recall that executing the `CreateBeneficiary` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateBeneficiaryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateBeneficiaryData {
  beneficiary_insert: Beneficiary_Key;
}
```
### Using `CreateBeneficiary`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createBeneficiary, CreateBeneficiaryVariables } from '@dataconnect/generated';

// The `CreateBeneficiary` mutation requires an argument of type `CreateBeneficiaryVariables`:
const createBeneficiaryVars: CreateBeneficiaryVariables = {
  name: ..., 
  createdAt: ..., 
  bankDetails: ..., // optional
  contactInfo: ..., // optional
  description: ..., // optional
  status: ..., // optional
};

// Call the `createBeneficiary()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createBeneficiary(createBeneficiaryVars);
// Variables can be defined inline as well.
const { data } = await createBeneficiary({ name: ..., createdAt: ..., bankDetails: ..., contactInfo: ..., description: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createBeneficiary(dataConnect, createBeneficiaryVars);

console.log(data.beneficiary_insert);

// Or, you can use the `Promise` API.
createBeneficiary(createBeneficiaryVars).then((response) => {
  const data = response.data;
  console.log(data.beneficiary_insert);
});
```

### Using `CreateBeneficiary`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createBeneficiaryRef, CreateBeneficiaryVariables } from '@dataconnect/generated';

// The `CreateBeneficiary` mutation requires an argument of type `CreateBeneficiaryVariables`:
const createBeneficiaryVars: CreateBeneficiaryVariables = {
  name: ..., 
  createdAt: ..., 
  bankDetails: ..., // optional
  contactInfo: ..., // optional
  description: ..., // optional
  status: ..., // optional
};

// Call the `createBeneficiaryRef()` function to get a reference to the mutation.
const ref = createBeneficiaryRef(createBeneficiaryVars);
// Variables can be defined inline as well.
const ref = createBeneficiaryRef({ name: ..., createdAt: ..., bankDetails: ..., contactInfo: ..., description: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createBeneficiaryRef(dataConnect, createBeneficiaryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.beneficiary_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.beneficiary_insert);
});
```

## AllocateFunds
You can execute the `AllocateFunds` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
allocateFunds(vars: AllocateFundsVariables): MutationPromise<AllocateFundsData, AllocateFundsVariables>;

interface AllocateFundsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AllocateFundsVariables): MutationRef<AllocateFundsData, AllocateFundsVariables>;
}
export const allocateFundsRef: AllocateFundsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
allocateFunds(dc: DataConnect, vars: AllocateFundsVariables): MutationPromise<AllocateFundsData, AllocateFundsVariables>;

interface AllocateFundsRef {
  ...
  (dc: DataConnect, vars: AllocateFundsVariables): MutationRef<AllocateFundsData, AllocateFundsVariables>;
}
export const allocateFundsRef: AllocateFundsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the allocateFundsRef:
```typescript
const name = allocateFundsRef.operationName;
console.log(name);
```

### Variables
The `AllocateFunds` mutation requires an argument of type `AllocateFundsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AllocateFundsVariables {
  donationId: UUIDString;
  beneficiaryId: UUIDString;
  allocatedAmount: number;
  allocationDate: DateString;
  notes?: string | null;
}
```
### Return Type
Recall that executing the `AllocateFunds` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AllocateFundsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AllocateFundsData {
  fundAllocation_insert: FundAllocation_Key;
}
```
### Using `AllocateFunds`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, allocateFunds, AllocateFundsVariables } from '@dataconnect/generated';

// The `AllocateFunds` mutation requires an argument of type `AllocateFundsVariables`:
const allocateFundsVars: AllocateFundsVariables = {
  donationId: ..., 
  beneficiaryId: ..., 
  allocatedAmount: ..., 
  allocationDate: ..., 
  notes: ..., // optional
};

// Call the `allocateFunds()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await allocateFunds(allocateFundsVars);
// Variables can be defined inline as well.
const { data } = await allocateFunds({ donationId: ..., beneficiaryId: ..., allocatedAmount: ..., allocationDate: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await allocateFunds(dataConnect, allocateFundsVars);

console.log(data.fundAllocation_insert);

// Or, you can use the `Promise` API.
allocateFunds(allocateFundsVars).then((response) => {
  const data = response.data;
  console.log(data.fundAllocation_insert);
});
```

### Using `AllocateFunds`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, allocateFundsRef, AllocateFundsVariables } from '@dataconnect/generated';

// The `AllocateFunds` mutation requires an argument of type `AllocateFundsVariables`:
const allocateFundsVars: AllocateFundsVariables = {
  donationId: ..., 
  beneficiaryId: ..., 
  allocatedAmount: ..., 
  allocationDate: ..., 
  notes: ..., // optional
};

// Call the `allocateFundsRef()` function to get a reference to the mutation.
const ref = allocateFundsRef(allocateFundsVars);
// Variables can be defined inline as well.
const ref = allocateFundsRef({ donationId: ..., beneficiaryId: ..., allocatedAmount: ..., allocationDate: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = allocateFundsRef(dataConnect, allocateFundsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.fundAllocation_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.fundAllocation_insert);
});
```

