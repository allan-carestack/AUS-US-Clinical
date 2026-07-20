import { i as __toESM, t as require_react } from "./react-CZunmVaX.js";
import "./useRenderElement-CD8_51dU.js";
//#region node_modules/@base-ui/react/esm/toolbar/root/ToolbarRootContext.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var ToolbarRootContext = /*#__PURE__*/ import_react.createContext(void 0);
ToolbarRootContext.displayName = "ToolbarRootContext";
function useToolbarRootContext(optional) {
	const context = import_react.useContext(ToolbarRootContext);
	if (context === void 0 && !optional) throw new Error("Base UI: ToolbarRootContext is missing. Toolbar parts must be placed within <Toolbar.Root>.");
	return context;
}
//#endregion
export { useToolbarRootContext as t };

//# sourceMappingURL=ToolbarRootContext-BoUlThJK.js.map