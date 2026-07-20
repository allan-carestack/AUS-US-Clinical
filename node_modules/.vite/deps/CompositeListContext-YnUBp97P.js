import { i as __toESM, t as require_react } from "./react-CZunmVaX.js";
//#region node_modules/@base-ui/react/esm/internals/composite/list/CompositeListContext.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var CompositeListContext = /*#__PURE__*/ import_react.createContext({
	register: () => {},
	unregister: () => {},
	subscribeMapChange: () => {
		return () => {};
	},
	elementsRef: { current: [] },
	nextIndexRef: { current: 0 }
});
CompositeListContext.displayName = "CompositeListContext";
function useCompositeListContext() {
	return import_react.useContext(CompositeListContext);
}
//#endregion
export { useCompositeListContext as n, CompositeListContext as t };

//# sourceMappingURL=CompositeListContext-YnUBp97P.js.map