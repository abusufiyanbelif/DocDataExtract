import { CreateBeneficiaryData, CreateBeneficiaryVariables, ListDonationsData, AllocateFundsData, AllocateFundsVariables, GetUserData, GetUserVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateBeneficiary(options?: useDataConnectMutationOptions<CreateBeneficiaryData, FirebaseError, CreateBeneficiaryVariables>): UseDataConnectMutationResult<CreateBeneficiaryData, CreateBeneficiaryVariables>;
export function useCreateBeneficiary(dc: DataConnect, options?: useDataConnectMutationOptions<CreateBeneficiaryData, FirebaseError, CreateBeneficiaryVariables>): UseDataConnectMutationResult<CreateBeneficiaryData, CreateBeneficiaryVariables>;

export function useListDonations(options?: useDataConnectQueryOptions<ListDonationsData>): UseDataConnectQueryResult<ListDonationsData, undefined>;
export function useListDonations(dc: DataConnect, options?: useDataConnectQueryOptions<ListDonationsData>): UseDataConnectQueryResult<ListDonationsData, undefined>;

export function useAllocateFunds(options?: useDataConnectMutationOptions<AllocateFundsData, FirebaseError, AllocateFundsVariables>): UseDataConnectMutationResult<AllocateFundsData, AllocateFundsVariables>;
export function useAllocateFunds(dc: DataConnect, options?: useDataConnectMutationOptions<AllocateFundsData, FirebaseError, AllocateFundsVariables>): UseDataConnectMutationResult<AllocateFundsData, AllocateFundsVariables>;

export function useGetUser(vars: GetUserVariables, options?: useDataConnectQueryOptions<GetUserData>): UseDataConnectQueryResult<GetUserData, GetUserVariables>;
export function useGetUser(dc: DataConnect, vars: GetUserVariables, options?: useDataConnectQueryOptions<GetUserData>): UseDataConnectQueryResult<GetUserData, GetUserVariables>;
