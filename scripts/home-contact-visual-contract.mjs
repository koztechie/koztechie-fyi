export const HOME_CONTACT_VISUAL_PROPERTIES = [
  "color",
  "backgroundColor",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textDecorationLine",
  "textDecorationStyle",
  "textTransform",
  "display",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "minHeight",
  "borderTopWidth",
  "borderTopStyle",
  "borderTopColor",
  "borderRightWidth",
  "borderRightStyle",
  "borderRightColor",
  "borderBottomWidth",
  "borderBottomStyle",
  "borderBottomColor",
  "borderLeftWidth",
  "borderLeftStyle",
  "borderLeftColor",
  "borderRadius",
  "boxShadow",
  "transform",
];

export function auditHomeContactVisualPriority(links, contactPath) {
  const errors = [];
  const contact = links.find((link) => link.path === contactPath);
  const peers = links.filter((link) => link.path !== contactPath);

  if (!contact) return [`пункт ${contactPath} відсутній в індексі`];
  if (!peers.length) return ["немає сусідніх посилань для порівняння ваги"];

  const signature = (link) =>
    HOME_CONTACT_VISUAL_PROPERTIES.map((property) => link.style?.[property] ?? "");
  const expected = JSON.stringify(signature(peers[0]));
  for (const peer of peers.slice(1)) {
    if (JSON.stringify(signature(peer)) !== expected) {
      errors.push("посилання індексу мають різні базові стилі; порівняння неоднозначне");
      break;
    }
  }
  if (JSON.stringify(signature(contact)) !== expected) {
    errors.push("контакт у індексі має окрему візуальну вагу");
  }

  return errors;
}
