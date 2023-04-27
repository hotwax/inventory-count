import { AbilityBuilder, PureAbility } from '@casl/ability';
import { getEvaluator, parse } from 'boon-js';
import { Tokens } from 'boon-js/lib/types'

// TODO Improve this
// We will move this code to an external plugin and use below Actions and Rules accordlingly
let Actions = {} as any;
let Rules = {} as any;

// We are using CASL library to define permissions.
// Instead of using Action-Subject based authorisation we are going with Claim based Authorization.
// We would be defining the permissions for each action and case, map with server permissiosn based upon certain rules.
// https://casl.js.org/v5/en/cookbook/claim-authorization
// Following the comment of Sergii Stotskyi, author of CASL
// https://github.com/stalniy/casl/issues/525
// We are defining a PureAbility and creating an instance with AbilityBuilder.
type ClaimBasedAbility = PureAbility<string>;
const { build } = new AbilityBuilder<ClaimBasedAbility>(PureAbility);
const ability = build();

/**
 * The method returns list of permissions required for the rules. We are having set of rules, 
 * through which app permissions are defined based upon the server permissions.
 * When getting server permissions, as all the permissions are not be required. 
 * Specific permissions used defining the rules are extracted and sent to server. 
 * @returns permissions
 */
const getServerPermissionsFromRules = () => {
    // Iterate for each rule
    const permissions = Object.keys(Rules).reduce((permissions: any, rule: any) => {
        const permissionRule = Rules[rule];
        // some rules may be empty, no permission is required from server
        if (permissionRule) {
            // Each rule may have multiple permissions along with operators
            // Boon js parse rules into tokens, each token may be operator or server permission
            // permissionId will have token name as identifier. 
            const permissionTokens = parse(permissionRule);
            permissions = permissionTokens.reduce((permissions: any, permissionToken: any) => {
                // Token object with name as identifier has permissionId 
                if (Tokens.IDENTIFIER === permissionToken.name) {
                    permissions.add(permissionToken.value);
                }
                return permissions;
            }, permissions)
        }
        return permissions;
    }, new Set())
    return [...permissions];
}

/**
 * The method is used to prepare app permissions from the server permissions.
 * Rules could be defined such that each app permission could be defined based upon certain one or more server permissions.
 * @param serverPermissions 
 * @returns appPermissions
 */
const prepareAppPermissions = (serverPermissions: any) => {
    const serverPermissionsInput = serverPermissions.reduce((serverPermissionsInput: any, permission: any) => {
        serverPermissionsInput[permission] = true;
        return serverPermissionsInput;
    }, {})
    // Boonjs evaluator needs server permissions as object with permissionId and boolean value
    // Each rule is passed to evaluator along with the server permissions
    // if the server permissions and rule matches, app permission is added to list
    const permissions = Object.keys(Rules).reduce((permissions: any, rule: any) => {
        const permissionRule = Rules[rule];
        // If for any app permission, we have empty rule we user is assigned the permission
        // If rule is not defined, the app permisions is still evaluated or provided to all the users.
        if (!permissionRule || (permissionRule && getEvaluator(permissionRule)(serverPermissionsInput))) {
            permissions.push(rule);
        }
        return permissions;
    }, [])
    const { can, rules } = new AbilityBuilder<ClaimBasedAbility>(PureAbility);
    permissions.map((permission: any) => {
        can(permission);
    })
    return rules;
}

/**
 * 
 * Sets the current app permissions. This should be used after perparing the app permissions from the server permissions
 * @param permissions 
 * @returns 
 */
const setPermissions = (permissions: any) => {
    // If the user has passed undefined or null, it should not break the code
    if (!permissions) permissions = [];
    ability.update(permissions)
    return true;
};

/**
 * Resets the permissions list. Used for cases like logout 
 */
const resetPermissions = () => setPermissions([]);

/**
 * 
 * @param permission 
 * @returns 
 */
const hasPermission = (permission: string) => ability.can(permission);

export { Actions, getServerPermissionsFromRules, hasPermission, prepareAppPermissions, resetPermissions, setPermissions};

// TODO Move this code to an external plugin, to be used across the apps
export default {
    install(app: any, options: any) {

        // Rules and Actions could be app and OMS package specific
        Rules = options.rules;
        Actions = options.actions;

        // TODO Check why global properties is not working and apply across.
        app.config.globalProperties.$permission = this;
    },
    getServerPermissionsFromRules, 
    hasPermission, 
    prepareAppPermissions, 
    resetPermissions, 
    setPermissions
}