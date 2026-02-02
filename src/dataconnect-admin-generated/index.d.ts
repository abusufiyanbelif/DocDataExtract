import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

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

/** Generated Node Admin SDK operation action function for the 'CreateBeneficiary' Mutation. Allow users to execute without passing in DataConnect. */
export function createBeneficiary(dc: DataConnect, vars: CreateBeneficiaryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateBeneficiaryData>>;
/** Generated Node Admin SDK operation action function for the 'CreateBeneficiary' Mutation. Allow users to pass in custom DataConnect instances. */
export function createBeneficiary(vars: CreateBeneficiaryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateBeneficiaryData>>;

/** Generated Node Admin SDK operation action function for the 'ListDonations' Query. Allow users to execute without passing in DataConnect. */
export function listDonations(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListDonationsData>>;
/** Generated Node Admin SDK operation action function for the 'ListDonations' Query. Allow users to pass in custom DataConnect instances. */
export function listDonations(options?: OperationOptions): Promise<ExecuteOperationResponse<ListDonationsData>>;

/** Generated Node Admin SDK operation action function for the 'AllocateFunds' Mutation. Allow users to execute without passing in DataConnect. */
export function allocateFunds(dc: DataConnect, vars: AllocateFundsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AllocateFundsData>>;
/** Generated Node Admin SDK operation action function for the 'AllocateFunds' Mutation. Allow users to pass in custom DataConnect instances. */
export function allocateFunds(vars: AllocateFundsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AllocateFundsData>>;

/** Generated Node Admin SDK operation action function for the 'GetUser' Query. Allow users to execute without passing in DataConnect. */
export function getUser(dc: DataConnect, vars: GetUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserData>>;
/** Generated Node Admin SDK operation action function for the 'GetUser' Query. Allow users to pass in custom DataConnect instances. */
export function getUser(vars: GetUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserData>>;

