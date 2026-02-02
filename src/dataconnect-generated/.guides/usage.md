# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateBeneficiary, useListDonations, useAllocateFunds, useGetUser } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateBeneficiary(createBeneficiaryVars);

const { data, isPending, isSuccess, isError, error } = useListDonations();

const { data, isPending, isSuccess, isError, error } = useAllocateFunds(allocateFundsVars);

const { data, isPending, isSuccess, isError, error } = useGetUser(getUserVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createBeneficiary, listDonations, allocateFunds, getUser } from '@dataconnect/generated';


// Operation CreateBeneficiary:  For variables, look at type CreateBeneficiaryVars in ../index.d.ts
const { data } = await CreateBeneficiary(dataConnect, createBeneficiaryVars);

// Operation ListDonations: 
const { data } = await ListDonations(dataConnect);

// Operation AllocateFunds:  For variables, look at type AllocateFundsVars in ../index.d.ts
const { data } = await AllocateFunds(dataConnect, allocateFundsVars);

// Operation GetUser:  For variables, look at type GetUserVars in ../index.d.ts
const { data } = await GetUser(dataConnect, getUserVars);


```