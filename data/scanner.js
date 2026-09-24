/*
 * Handheld configuration: delivery types and exception codes.
 * The codes below are ILLUSTRATIVE training codes. Replace them with your station's official list.
 *
 *   deliveryTypes[id] = { label, needsPerson, pod: 'signature' | 'photo' | 'none' }
 *   exceptions[]      = { id, label, desc, doorTag (a door tag should be left), keepPackage (return it to the van),
 *                         attempt: false when you should NOT try the door first (it is unsafe to) }
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.handheld = {
  deliveryTypes: {
    recipient: { label: 'Handed to recipient', needsPerson: true, pod: 'signature' },
    adult: { label: 'Handed to adult at address', needsPerson: true, pod: 'signature' },
    reception: { label: 'Reception / mailroom signed', needsPerson: true, pod: 'signature' },
    left: { label: 'Left at location (photo)', needsPerson: false, pod: 'photo' },
    neighbor: { label: 'Left with neighbor', needsPerson: true, pod: 'signature' }
  },

  exceptions: [
    { id: 'NA', label: 'Recipient not available', desc: 'Nobody available to accept or sign.', doorTag: true, keepPackage: true },
    { id: 'BC', label: 'Business closed', desc: 'Business closed at time of attempt.', doorTag: true, keepPackage: true },
    { id: 'RF', label: 'Refused by recipient', desc: 'Recipient declined the package.', doorTag: false, keepPackage: true },
    { id: 'AD', label: 'Address problem', desc: 'Incorrect, incomplete or unable to locate address.', doorTag: false, keepPackage: true },
    { id: 'AC', label: 'No access', desc: 'Locked gate / building, no safe access.', doorTag: true, keepPackage: true },
    { id: 'UN', label: 'Unsafe to deliver', desc: 'Animal, hazard or threat at the address.', doorTag: false, keepPackage: true, attempt: false },
    { id: 'DM', label: 'Package damaged', desc: 'Damage found before delivery.', doorTag: false, keepPackage: true },
    { id: 'ID', label: 'ID / age not verified', desc: 'Adult signature could not be verified.', doorTag: true, keepPackage: true }
  ],

  tagPrefix: 'DT'
};
