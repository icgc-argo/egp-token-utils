import {
  decodeToken,
  PERMISSIONS,
  PermissionScopeObj,
  isPermission,
  PROGRAM_PREFIX,
  PROGRAM_DATA_PREFIX,
  parseScope,
} from './common';
import {
  canReadProgramData,
  canWriteProgramData,
  canReadSomeProgramData,
  canWriteSomeProgramData,
  getReadableProgramDataScopes,
  getWritableProgramDataScopes,
  getReadableProgramDataNames,
  getWritableProgramDataNames,
} from './programDataUtils';
import { isDccMember, isRdpcMember } from './argoRoleChecks';

import * as jwt from 'jsonwebtoken';

/**
 * checks if a given jwt is valid and has not expired.
 * currently does not validate against Ego signature
 * @param egoJwt
 */
const isValidJwt = (egoPublicKey: string) => (egoJwt?: string) => {
  try {
    if (!egoJwt || !egoPublicKey) {
      return false;
    } else {
      return jwt.verify(egoJwt, egoPublicKey, { algorithms: ['RS256'] }) && true;
    }
  } catch (err) {
    return false;
  }
};

/**
 * takes an PermissionScopeObj and returns a scope string in the format `<policy>.<permission>`
 * @param scopeObj
 */
const serializeScope = (scopeObj: PermissionScopeObj): string => {
  if (isPermission(scopeObj.permission)) {
    return `${scopeObj.policy}.${scopeObj.permission}`;
  } else {
    throw new Error(`invalid permission: ${scopeObj.permission}`);
  }
};

/**
 * get an array of all permissions from the token
 * @param egoJwt
 */
const getPermissionsFromToken = (egoPublicKey: string) => (egoJwt: string): string[] => {
  try {
    const data = decodeToken(egoPublicKey)(egoJwt);
    return data.context.scope;
  } catch (err) {
    return [];
  }
};

/**
 * get an array of PermissionScopeObj which gives at least `.READ` permission to the token
 * does not return entries that are given `.DENY`
 * @param permissions as string[]
 */
const getReadableProgramScopes = (permissions: string[]): PermissionScopeObj[] => {
  const programPermissions = permissions.filter(p => {
    const policy = p.split('.')[0];
    const output =
      policy.indexOf(PROGRAM_PREFIX) === 0 && policy.indexOf(PROGRAM_DATA_PREFIX) !== 0;
    return output;
  });

  return programPermissions
    .map(parseScope)
    .filter(
      scopeObj =>
        [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.ADMIN].includes(scopeObj.permission) &&
        ![PERMISSIONS.DENY].includes(scopeObj.permission),
    );
};
/**
 * get an array of PermissionScopeObj which gives at least `.WRITE` permission to the token
 * does not return entries that are given `.DENY`
 * @param permissions as string[]
 */
const getWriteableProgramScopes = (permissions: string[]): PermissionScopeObj[] => {
  const programPermissions = permissions.filter(p => {
    const policy = p.split('.')[0];
    const output =
      policy.indexOf(PROGRAM_PREFIX) === 0 && policy.indexOf(PROGRAM_DATA_PREFIX) !== 0;
    return output;
  });

  return programPermissions
    .map(parseScope)
    .filter(
      scopeObj =>
        [PERMISSIONS.WRITE, PERMISSIONS.ADMIN].includes(scopeObj.permission) &&
        ![PERMISSIONS.DENY].includes(scopeObj.permission),
    );
};

/**
 * get an array of program short names where the user has been given at least `.READ` permission
 * in the provided token
 * @param scopeObj in array
 */
const getReadableProgramShortNames = (readableScopes: PermissionScopeObj[]) => {
  return readableScopes.map(({ policy }) => policy.replace(PROGRAM_PREFIX, ''));
};

/**
 * get an array of program short names where the user has been given at least `.WRITE` permission
 * in the provided token
 * @param scopeObj in array
 */
const getWriteableProgramShortNames = (writableScopes: PermissionScopeObj[]) => {
  return writableScopes.map(({ policy }) => policy.replace(PROGRAM_PREFIX, ''));
};
/**
 * check if given permissions can read program with given id
 * @param args
 */
const canReadProgram = (args: { permissions: string[]; programId: string }): boolean => {
  const authorizedProgramScopes = getReadableProgramScopes(args.permissions);
  const programIds = authorizedProgramScopes.map(({ policy }) =>
    policy.replace(PROGRAM_PREFIX, ''),
  );

  return isDccMember(args.permissions) || programIds.some(id => id === args.programId);
};

/**
 * check if given permissions can write program with given id
 * @param args
 */
const canWriteProgram = (args: { permissions: string[]; programId: string }): boolean => {
  const authorizedProgramScopes = getReadableProgramScopes(args.permissions);
  return (
    isDccMember(args.permissions) ||
    authorizedProgramScopes.some(({ policy, permission }) => {
      const programId = policy.replace(PROGRAM_PREFIX, '');
      return (
        programId === args.programId && [PERMISSIONS.WRITE, PERMISSIONS.ADMIN].includes(permission)
      );
    })
  );
};

/**
 * checks if given permissions can read any program at all
 * @param permissions as string[]
 */
const canReadSomeProgram = (permissions: string[]) => {
  return isDccMember(permissions) || !!getReadableProgramScopes(permissions).length;
};

/**
 * checks if given permissions can write to any program at all
 * @param permissions as string[]
 */
const canWriteSomeProgram = (permissions: string[]) => {
  return isDccMember(permissions) || !!getWriteableProgramScopes(permissions).length;
};

/**
 * check if given permissions has admin access to program with given id
 * @param args
 */
const isProgramAdmin = (args: { permissions: string[]; programId: string }): boolean =>
  canWriteProgram(args);

export default (egoPublicKey: string) => ({
  serializeScope: serializeScope,
  parseScope: parseScope,
  isPermission: isPermission,
  decodeToken: decodeToken(egoPublicKey),
  isValidJwt: isValidJwt(egoPublicKey),
  isDccMember: isDccMember,
  isRdpcMember: isRdpcMember,
  getPermissionsFromToken: getPermissionsFromToken(egoPublicKey),
  getReadableProgramScopes: getReadableProgramScopes,
  getWriteableProgramScopes: getWriteableProgramScopes,
  canReadProgram: canReadProgram,
  canWriteProgram: canWriteProgram,
  isProgramAdmin: isProgramAdmin,
  canReadSomeProgram: canReadSomeProgram,
  canWriteSomeProgram: canWriteSomeProgram,
  getReadableProgramShortNames: getReadableProgramShortNames,
  getWriteableProgramShortNames: getWriteableProgramShortNames,
  canReadProgramData: canReadProgramData,
  canWriteProgramData: canWriteProgramData,
  canReadSomeProgramData: canReadSomeProgramData,
  canWriteSomeProgramData: canWriteSomeProgramData,
  getReadableProgramDataScopes: getReadableProgramDataScopes,
  getWritableProgramDataScopes: getWritableProgramDataScopes,
  getReadableProgramDataNames: getReadableProgramDataNames,
  getWritableProgramDataNames: getWritableProgramDataNames,
});
