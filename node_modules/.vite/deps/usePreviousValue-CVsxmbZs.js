import { i as __toESM, t as require_react } from "./react-CZunmVaX.js";
//#region node_modules/@base-ui/utils/esm/usePreviousValue.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/**
* Returns a previous value of its argument.
* @param value Current value.
* @returns Previous value, or null if there is no previous value.
*/
function usePreviousValue(value) {
	const [state, setState] = import_react.useState({
		current: value,
		previous: null
	});
	if (value !== state.current) setState({
		current: value,
		previous: state.current
	});
	return state.previous;
}
//#endregion
export { usePreviousValue as t };

//# sourceMappingURL=usePreviousValue-CVsxmbZs.js.map