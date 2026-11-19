import React, { useState, useEffect } from "react";
import { TextField, Box, Typography } from "@mui/material";

const TextFieldWithCounter = ({
	label,
	value,
	onChange,
	characterLimit = 100,
	numericOnly = false,
	...props
}) => {
	const [charCount, setCharCount] = useState(value.length || 0); // Track current character count

	useEffect(() => {
		setCharCount(value.length); // Update count when value prop changes
	}, [value]);

	const handleInputChange = (e) => {
		let inputValue = e.target.value;

		// If numericOnly is true, restrict input to numbers and only one decimal point
		if (numericOnly) {
			inputValue = inputValue.replace(/[^0-9.]/g, ""); // Remove non-numeric characters except decimal point

			// If more than one decimal point is found, remove additional ones
			const decimalIndex = inputValue.indexOf(".");
			if (decimalIndex !== -1) {
				// Keep the first decimal point and remove all subsequent ones
				inputValue =
					inputValue.slice(0, decimalIndex + 1) +
					inputValue.slice(decimalIndex + 1).replace(/\./g, "");
			}
		}

		// If the input length is within the character limit, update the state and call onChange
		if (inputValue.length <= characterLimit) {
			setCharCount(inputValue.length);
			onChange({ target: { name: props.name, value: inputValue } }); // Pass updated value to parent onChange handler
		}
	};

	return (
		<Box sx={{ position: "relative", mb: 2 }}>
			<TextField
				{...props}
				label={label}
				value={value}
				onChange={handleInputChange}
				fullWidth
				multiline
				minRows={1} // Minimum rows to display
				maxRows={10} // Maximum rows before the text field stops growing
				type={numericOnly ? "text" : props.type} // Set type to 'text' if numericOnly, else use passed type
				error={charCount > characterLimit} // Turn red if exceeding character limit
				helperText={
					charCount > characterLimit
						? `Character limit exceeded!`
						: ""
				}
				margin="dense"
				slotProps={{ formHelperText: {
					sx: { marginTop: "4px" } }, // Adjust spacing for helper text
				}}
				sx={{
					"& .MuiOutlinedInput-root": {
						borderColor: charCount > characterLimit ? "red" : "",
					},
					"& .MuiFormLabel-root.Mui-error": {
						color: charCount > characterLimit ? "red" : "", // Make label red if error
					},
					"& .MuiOutlinedInput-notchedOutline": {
						borderColor: charCount > characterLimit ? "red" : "",
					},
				}}
			/>

			{/* Display character counter */}
			<Typography
				variant="caption"
				sx={{
					position: "absolute",
					bottom: -20,
					right: 0,
					color:
						charCount > characterLimit ? "red" : "text.secondary",
				}}
			>
				{`${charCount}/${characterLimit}`}
			</Typography>
		</Box>
	);
};

export default TextFieldWithCounter;
