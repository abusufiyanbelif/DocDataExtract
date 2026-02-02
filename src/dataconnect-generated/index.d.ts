import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AllocateFundsData {
  fundAllocation_insert: FundAllocation_Key;
}

export interface AllocateFundsVariables {
  donationId: UUIDString;
  beneficiaryId: UUIDString;
  allocatedAmount: number;
  allocationDate: DateString;
  notes?: string | null;
}

export interface Beneficiary_Key {
  id: UUIDString;
  __typename?: 'Beneficiary_Key';
}

export interface CreateBeneficiaryData {
  beneficiary_insert: Beneficiary_Key;
}

export interface CreateBeneficiaryVariables {
  name: string;
  createdAt: TimestampString;
  bankDetails?: string | null;
  contactInfo?: string | null;
  description?: string | null;
  status?: string | null;
}

export interface Donation_Key {
  id: UUIDString;
  __typename?: 'Donation_Key';
}

export interface FundAllocation_Key {
  donationId: UUIDString;
  beneficiaryId: UUIDString;
  __typename?: 'FundAllocation_Key';
}

export interface GetUserData {
  user?: {
    id: UUIDString;
    username: string;
    email: string;
    role?: string | null;
  } & User_Key;
}

export interface GetUserVariables {
  id: UUIDString;
}

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

export interface Organization_Key {
  id: UUIDString;
  __typename?: 'Organization_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateBeneficiaryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateBeneficiaryVariables): MutationRef<CreateBeneficiaryData, CreateBeneficiaryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateBeneficiaryVariables): MutationRef<CreateBeneficiaryData, CreateBeneficiaryVariables>;
  operationName: string;
}
export const createBeneficiaryRef: CreateBeneficiaryRef;

export function createBeneficiary(vars: CreateBeneficiaryVariables): MutationPromise<CreateBeneficiaryData, CreateBeneficiaryVariables>;
export function createBeneficiary(dc: DataConnect, vars: CreateBeneficiaryVariables): MutationPromise<CreateBeneficiaryData, CreateBeneficiaryVariables>;

interface ListDonationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDonationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListDonationsData, undefined>;
  operationName: string;
}
export const listDonationsRef: ListDonationsRef;

export function listDonations(): QueryPromise<ListDonationsData, undefined>;
export function listDonations(dc: DataConnect): QueryPromise<ListDonationsData, undefined>;

interface AllocateFundsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AllocateFundsVariables): MutationRef<AllocateFundsData, AllocateFundsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AllocateFundsVariables): MutationRef<AllocateFundsData, AllocateFundsVariables>;
  operationName: string;
}
export const allocateFundsRef: AllocateFundsRef;

export function allocateFunds(vars: AllocateFundsVariables): MutationPromise<AllocateFundsData, AllocateFundsVariables>;
export function allocateFunds(dc: DataConnect, vars: AllocateFundsVariables): MutationPromise<AllocateFundsData, AllocateFundsVariables>;

interface GetUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserVariables): QueryRef<GetUserData, GetUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserVariables): QueryRef<GetUserData, GetUserVariables>;
  operationName: string;
}
export const getUserRef: GetUserRef;

export function getUser(vars: GetUserVariables): QueryPromise<GetUserData, GetUserVariables>;
export function getUser(dc: DataConnect, vars: GetUserVariables): QueryPromise<GetUserData, GetUserVariables>;

