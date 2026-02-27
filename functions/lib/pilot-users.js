"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PILOT_USER_EMAILS = void 0;
exports.isPilotUser = isPilotUser;
exports.PILOT_USER_EMAILS = [
    'asesoria@asesoriapozuelo.com',
];
function isPilotUser(email) {
    if (!email)
        return false;
    const normalized = email.trim().toLowerCase();
    return exports.PILOT_USER_EMAILS.includes(normalized);
}
//# sourceMappingURL=pilot-users.js.map