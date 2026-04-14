import { GraphQLClient, gql } from 'graphql-request';
import type {
  AddMemberInput,
  AddMemberResult,
  EmployerSummary,
  Enrollment,
  FileJob,
  GroupAdminView,
  Page,
  Payer,
  PlanSummary,
  SearchFilter,
  SearchResult,
  Subgroup,
  TimelineSegment,
  UploadResponse,
} from './types';

const BASE_URL = (import.meta.env.VITE_BFF_URL as string | undefined) ?? 'http://localhost:4000';
const GRAPHQL_URL = `${BASE_URL.replace(/\/$/, '')}/graphql`;
const REST_URL = BASE_URL.replace(/\/$/, '');

function newCorrelationId(): string {
  const rnd = () => Math.random().toString(36).slice(2, 10);
  return `cid-${Date.now().toString(36)}-${rnd()}`;
}

function getTenantId(): string {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('bff.tenantId');
    if (stored) return stored;
  }
  return '11111111-1111-1111-1111-111111111111';
}

let lastCorrelationId = '';
export function getLastCorrelationId(): string {
  return lastCorrelationId;
}

function buildHeaders(): Record<string, string> {
  const cid = newCorrelationId();
  lastCorrelationId = cid;
  return {
    'X-Tenant-Id': getTenantId(),
    'X-Correlation-Id': cid,
    'Content-Type': 'application/json',
  };
}

function client(): GraphQLClient {
  return new GraphQLClient(GRAPHQL_URL, { headers: buildHeaders() });
}

const SEARCH = gql`
  query Search($filter: SearchFilter, $page: Page) {
    searchEnrollments(filter: $filter, page: $page) {
      items {
        enrollmentId
        tenantId
        employerId
        employerName
        subgroupName
        planId
        planName
        planCode
        memberId
        memberName
        firstName
        lastName
        dob
        gender
        cardNumber
        ssnLast4
        relationship
        status
        effectiveDate
        terminationDate
      }
      total
      nextCursor
    }
  }
`;

const MEMBER_BY_CARD = gql`
  query MemberByCard($cardNumber: String!) {
    memberByCard(cardNumber: $cardNumber) {
      enrollmentId
      memberId
      memberName
      firstName
      lastName
      cardNumber
      dob
      employerName
      planName
      status
      effectiveDate
      terminationDate
      relationship
    }
  }
`;

const TIMELINE = gql`
  query Timeline($memberId: ID!) {
    enrollmentTimeline(memberId: $memberId) {
      id
      planId
      planName
      status
      validFrom
      validTo
      txnFrom
      txnTo
      isInForce
      sourceFileId
      sourceSegmentRef
    }
  }
`;

const FILE_JOB = gql`
  query Job($fileId: ID!) {
    fileJob(fileId: $fileId) {
      id
      fileId
      objectKey
      format
      status
      uploadedAt
      totalRows
      successRows
      failedRows
    }
  }
`;

const EMPLOYERS = gql`
  query Employers($search: String) {
    employers(search: $search) {
      id
      name
      externalId
      payerId
    }
  }
`;

const PLANS_QUERY = gql`
  query Plans {
    plans {
      id
      planCode
      name
      type
      metalLevel
    }
  }
`;

const TERMINATE = gql`
  mutation Terminate($memberId: ID!, $planId: ID!, $validTo: Date!) {
    terminateEnrollment(memberId: $memberId, planId: $planId, validTo: $validTo)
  }
`;

const REPLAY = gql`
  mutation Replay($fileId: ID!) {
    replayFile(fileId: $fileId)
  }
`;

const ADD_MEMBER = gql`
  mutation AddMember($input: AddMemberInput!) {
    addMember(input: $input) {
      memberId
      enrollmentId
      memberName
    }
  }
`;

const CHANGE_PLAN = gql`
  mutation ChangePlan(
    $memberId: ID!
    $oldPlanId: ID!
    $newPlanId: ID!
    $employerId: ID!
    $newValidFrom: Date!
    $relationship: String
  ) {
    changeEnrollmentPlan(
      memberId: $memberId
      oldPlanId: $oldPlanId
      newPlanId: $newPlanId
      employerId: $employerId
      newValidFrom: $newValidFrom
      relationship: $relationship
    )
  }
`;

const GROUP_ADMIN = gql`
  query GroupAdmin {
    payers { id name }
    plans { id planCode name }
    groupAdmin {
      id
      name
      externalId
      payerId
      payerName
      subgroups { id employerId name }
      visiblePlanIds
    }
  }
`;

const CREATE_PAYER = gql`mutation CP($name: String!) { createPayer(name: $name) { id name } }`;
const CREATE_EMPLOYER = gql`
  mutation CE($payerId: ID!, $name: String!, $externalId: String) {
    createEmployer(payerId: $payerId, name: $name, externalId: $externalId) {
      id name externalId payerId
    }
  }
`;
const DELETE_EMPLOYER = gql`mutation DE($id: ID!) { deleteEmployer(employerId: $id) }`;
const CREATE_SUBGROUP = gql`
  mutation CS($employerId: ID!, $name: String!) {
    createSubgroup(employerId: $employerId, name: $name) { id employerId name }
  }
`;
const DELETE_SUBGROUP = gql`mutation DS($id: ID!) { deleteSubgroup(subgroupId: $id) }`;
const ATTACH_PLAN = gql`mutation AP($e: ID!, $p: ID!) { attachPlan(employerId: $e, planId: $p) }`;
const DETACH_PLAN = gql`mutation DP($e: ID!, $p: ID!) { detachPlan(employerId: $e, planId: $p) }`;

export async function searchEnrollments(filter: SearchFilter, page: Page): Promise<SearchResult> {
  const { searchEnrollments } = await client().request<{ searchEnrollments: SearchResult }>(SEARCH, {
    filter,
    page,
  });
  return searchEnrollments;
}

export async function memberByCard(cardNumber: string): Promise<Enrollment | null> {
  const { memberByCard } = await client().request<{ memberByCard: Enrollment | null }>(MEMBER_BY_CARD, {
    cardNumber,
  });
  return memberByCard;
}

export async function enrollmentTimeline(memberId: string): Promise<TimelineSegment[]> {
  const { enrollmentTimeline } = await client().request<{ enrollmentTimeline: TimelineSegment[] }>(
    TIMELINE,
    { memberId },
  );
  return enrollmentTimeline;
}

export async function fileJob(fileId: string): Promise<FileJob | null> {
  const { fileJob } = await client().request<{ fileJob: FileJob | null }>(FILE_JOB, { fileId });
  return fileJob;
}

export async function employers(search?: string): Promise<EmployerSummary[]> {
  const { employers } = await client().request<{ employers: EmployerSummary[] }>(EMPLOYERS, { search });
  return employers;
}

export async function plans(): Promise<PlanSummary[]> {
  const { plans } = await client().request<{ plans: PlanSummary[] }>(PLANS_QUERY);
  return plans;
}

export async function terminateEnrollment(
  memberId: string,
  planId: string,
  validTo: string,
): Promise<string[]> {
  const { terminateEnrollment } = await client().request<{ terminateEnrollment: string[] }>(TERMINATE, {
    memberId,
    planId,
    validTo,
  });
  return terminateEnrollment;
}

export async function replayFile(fileId: string): Promise<boolean> {
  const { replayFile } = await client().request<{ replayFile: boolean }>(REPLAY, { fileId });
  return replayFile;
}

export async function addMember(input: AddMemberInput): Promise<AddMemberResult> {
  const { addMember } = await client().request<{ addMember: AddMemberResult }>(ADD_MEMBER, { input });
  return addMember;
}

export interface ChangePlanInput {
  memberId: string;
  oldPlanId: string;
  newPlanId: string;
  employerId: string;
  newValidFrom: string;
  relationship?: string;
}
export async function changeEnrollmentPlan(input: ChangePlanInput): Promise<string> {
  const { changeEnrollmentPlan } = await client().request<{ changeEnrollmentPlan: string }>(
    CHANGE_PLAN, { ...input } as Record<string, unknown>,
  );
  return changeEnrollmentPlan;
}

export interface GroupAdminBundle {
  payers: Payer[];
  plans: PlanSummary[];
  groupAdmin: GroupAdminView[];
}
export async function groupAdmin(): Promise<GroupAdminBundle> {
  return client().request<GroupAdminBundle>(GROUP_ADMIN);
}
export async function createPayer(name: string): Promise<Payer> {
  const { createPayer } = await client().request<{ createPayer: Payer }>(CREATE_PAYER, { name });
  return createPayer;
}
export async function createEmployer(payerId: string, name: string, externalId?: string): Promise<EmployerSummary> {
  const { createEmployer } = await client().request<{ createEmployer: EmployerSummary }>(
    CREATE_EMPLOYER, { payerId, name, externalId: externalId ?? null });
  return createEmployer;
}
export async function deleteEmployer(id: string): Promise<boolean> {
  const { deleteEmployer } = await client().request<{ deleteEmployer: boolean }>(DELETE_EMPLOYER, { id });
  return deleteEmployer;
}
export async function createSubgroup(employerId: string, name: string): Promise<Subgroup> {
  const { createSubgroup } = await client().request<{ createSubgroup: Subgroup }>(CREATE_SUBGROUP, { employerId, name });
  return createSubgroup;
}
export async function deleteSubgroup(id: string): Promise<boolean> {
  const { deleteSubgroup } = await client().request<{ deleteSubgroup: boolean }>(DELETE_SUBGROUP, { id });
  return deleteSubgroup;
}
export async function attachPlan(employerId: string, planId: string): Promise<boolean> {
  const { attachPlan } = await client().request<{ attachPlan: boolean }>(ATTACH_PLAN, { e: employerId, p: planId });
  return attachPlan;
}
export async function detachPlan(employerId: string, planId: string): Promise<boolean> {
  const { detachPlan } = await client().request<{ detachPlan: boolean }>(DETACH_PLAN, { e: employerId, p: planId });
  return detachPlan;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const cid = newCorrelationId();
  lastCorrelationId = cid;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${REST_URL}/files/eligibility`, {
    method: 'POST',
    headers: {
      'X-Tenant-Id': getTenantId(),
      'X-Correlation-Id': cid,
    },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as UploadResponse;
}

export const __test__ = { GRAPHQL_URL, REST_URL, buildHeaders };
