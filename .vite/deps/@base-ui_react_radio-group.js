import { i as __toESM, t as require_react } from "./react-CZunmVaX.js";
import { k as useStableCallback } from "./useRenderElement-CD8_51dU.js";
import { t as require_jsx_runtime } from "./jsx-runtime-DdbNDrdp.js";
import { r as contains } from "./DirectionContext-DZ5-Bwxo.js";
import { t as useControlled } from "./useControlled-BOktVa93.js";
import { t as useBaseUiId } from "./useBaseUiId-BJnNLmSV.js";
import { d as SHIFT } from "./composite-MHqWDSng.js";
import { t as CompositeRoot } from "./CompositeRoot-Dl9DO5A3.js";
import { i as useFieldRootContext, o as fieldValidityMapping, t as useLabelableContext } from "./LabelableContext-D9NkuaDX.js";
import { n as useRegisterFieldControl, t as useFormContext } from "./FormContext-9Xuyb5LE.js";
import { t as useValueChanged } from "./useValueChanged-DcqYqCq8.js";
import { t as RadioGroupContext } from "./RadioGroupContext-BK2EQbaL.js";
//#region node_modules/@base-ui/react/esm/fieldset/root/FieldsetRootContext.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var FieldsetRootContext = /*#__PURE__*/ import_react.createContext({
	legendId: void 0,
	setLegendId: () => {},
	disabled: void 0
});
FieldsetRootContext.displayName = "FieldsetRootContext";
function useFieldsetRootContext(optional = false) {
	const context = import_react.useContext(FieldsetRootContext);
	if (!context && !optional) throw new Error("Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.");
	return context;
}
//#endregion
//#region node_modules/@base-ui/react/esm/radio-group/RadioGroup.js
var import_jsx_runtime = require_jsx_runtime();
var MODIFIER_KEYS = [SHIFT];
/**
* Provides a shared state to a series of radio buttons.
* Renders a `<div>` element.
*
* Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio)
*/
var RadioGroup = /*#__PURE__*/ import_react.forwardRef(function RadioGroup(componentProps, forwardedRef) {
	const { render, className, disabled: disabledProp, readOnly, required, onValueChange: onValueChangeProp, value: externalValue, defaultValue, form, name: nameProp, inputRef: inputRefProp, id: idProp, style, ...elementProps } = componentProps;
	const { setTouched: setFieldTouched, setFocused, shouldValidateOnChange, validationMode, name: fieldName, disabled: fieldDisabled, state: fieldState, validation, setDirty, setFilled, validityData } = useFieldRootContext();
	const { labelId } = useLabelableContext();
	const { clearErrors } = useFormContext();
	const fieldsetContext = useFieldsetRootContext(true);
	const disabled = fieldDisabled || disabledProp;
	const name = fieldName ?? nameProp;
	const id = useBaseUiId(idProp);
	const [checkedValue, setCheckedValueUnwrapped] = useControlled({
		controlled: externalValue,
		default: defaultValue,
		name: "RadioGroup",
		state: "value"
	});
	const [touched, setTouched] = import_react.useState(false);
	const setCheckedValue = useStableCallback((value, eventDetails) => {
		onValueChangeProp?.(value, eventDetails);
		if (eventDetails.isCanceled) return;
		setCheckedValueUnwrapped(value);
	});
	const controlRef = import_react.useRef(null);
	const groupInputRef = import_react.useRef(null);
	const firstEnabledInputRef = import_react.useRef(null);
	function setInputRef(hiddenInput) {
		let cleanup = void 0;
		if (inputRefProp) if (typeof inputRefProp === "function") cleanup = inputRefProp(hiddenInput);
		else inputRefProp.current = hiddenInput;
		groupInputRef.current = hiddenInput;
		validation.inputRef.current = hiddenInput;
		return cleanup;
	}
	const registerControlRef = useStableCallback((element, isDisabled = false) => {
		if (!element) return;
		if (isDisabled) {
			if (controlRef.current === element) controlRef.current = null;
			return;
		}
		if (controlRef.current == null) controlRef.current = element;
	});
	const registerInputRef = useStableCallback((input) => {
		if (!input || input.disabled) return;
		if (!firstEnabledInputRef.current) firstEnabledInputRef.current = input;
		const currentInput = groupInputRef.current;
		if (input.checked || currentInput == null || currentInput.disabled) return setInputRef(input);
	});
	useRegisterFieldControl(controlRef, id, checkedValue ?? null);
	useValueChanged(checkedValue, () => {
		clearErrors(name);
		setDirty(checkedValue !== validityData.initialValue);
		setFilled(checkedValue != null);
		if (shouldValidateOnChange()) validation.commit(checkedValue);
		else validation.commit(checkedValue, true);
		const fallbackInput = firstEnabledInputRef.current;
		if (checkedValue == null && fallbackInput && !fallbackInput.disabled) setInputRef(fallbackInput);
	});
	const ariaLabelledby = elementProps["aria-labelledby"] ?? labelId ?? fieldsetContext?.legendId;
	const state = {
		...fieldState,
		disabled: disabled ?? false,
		required: required ?? false,
		readOnly: readOnly ?? false
	};
	const contextValue = import_react.useMemo(() => ({
		...fieldState,
		checkedValue,
		disabled,
		form,
		validation,
		name,
		readOnly,
		registerControlRef,
		registerInputRef,
		required,
		setCheckedValue,
		setTouched,
		touched
	}), [
		checkedValue,
		disabled,
		form,
		validation,
		fieldState,
		name,
		readOnly,
		registerControlRef,
		registerInputRef,
		required,
		setCheckedValue,
		setTouched,
		touched
	]);
	const defaultProps = {
		role: "radiogroup",
		"aria-required": required || void 0,
		"aria-disabled": disabled || void 0,
		"aria-readonly": readOnly || void 0,
		"aria-labelledby": ariaLabelledby,
		onFocus() {
			setFocused(true);
		},
		onBlur(event) {
			if (!contains(event.currentTarget, event.relatedTarget)) {
				setFieldTouched(true);
				setFocused(false);
				if (validationMode === "onBlur") validation.commit(checkedValue);
			}
		},
		onKeyDownCapture(event) {
			if (event.key.startsWith("Arrow")) {
				setFieldTouched(true);
				setTouched(true);
				setFocused(true);
			}
		}
	};
	return /*#__PURE__*/ (0, import_jsx_runtime.jsx)(RadioGroupContext.Provider, {
		value: contextValue,
		children: /*#__PURE__*/ (0, import_jsx_runtime.jsx)(CompositeRoot, {
			render,
			className,
			style,
			state,
			props: [
				defaultProps,
				validation.getValidationProps,
				elementProps
			],
			refs: [forwardedRef],
			stateAttributesMapping: fieldValidityMapping,
			enableHomeAndEndKeys: false,
			modifierKeys: MODIFIER_KEYS
		})
	});
});
RadioGroup.displayName = "RadioGroup";
//#endregion
export { RadioGroup };

//# sourceMappingURL=@base-ui_react_radio-group.js.map