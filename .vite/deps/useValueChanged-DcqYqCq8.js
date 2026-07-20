import { i as __toESM, t as require_react } from "./react-CZunmVaX.js";
import { O as useIsoLayoutEffect, k as useStableCallback } from "./useRenderElement-CD8_51dU.js";
//#region node_modules/@base-ui/react/esm/internals/useValueChanged.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function useValueChanged(value, onChange) {
	const valueRef = import_react.useRef(value);
	const onChangeCallback = useStableCallback(onChange);
	useIsoLayoutEffect(() => {
		if (valueRef.current === value) return;
		onChangeCallback(valueRef.current);
	}, [value, onChangeCallback]);
	useIsoLayoutEffect(() => {
		valueRef.current = value;
	}, [value]);
}
//#endregion
export { useValueChanged as t };

//# sourceMappingURL=useValueChanged-DcqYqCq8.js.map