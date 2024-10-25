import React, { useState, useEffect } from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import "./style.css";

// Helper function to determine brightness based on image URL
const getImageBrightness = (imageUrl, callback) => {
	const img = new Image();
	img.src = imageUrl;
	img.crossOrigin = "Anonymous"; // Ensure cross-origin compatibility

	img.onload = () => {
		const canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0, img.width, img.height);

		const imageData = ctx.getImageData(0, 0, img.width, img.height);
		let totalBrightness = 0;
		const pixelCount = imageData.data.length / 4;

		for (let i = 0; i < imageData.data.length; i += 4) {
			const r = imageData.data[i];
			const g = imageData.data[i + 1];
			const b = imageData.data[i + 2];

			// Calculate brightness (using the simple formula for brightness)
			const brightness = (r * 299 + g * 587 + b * 114) / 1000;
			totalBrightness += brightness;
		}

		const avgBrightness = totalBrightness / pixelCount;
		callback(avgBrightness);
	};
};

const ControlledCarousel = ({ images }) => {
	const [activeIndex, setActiveIndex] = useState(0);
	const [brightnessValues, setBrightnessValues] = useState([]);

	useEffect(() => {
		const calculateBrightness = async () => {
			const newBrightnessValues = await Promise.all(
				images.map(
					(image) =>
						new Promise((resolve) => {
							getImageBrightness(image, resolve);
						})
				)
			);
			setBrightnessValues(newBrightnessValues);
		};

		calculateBrightness();
	}, [images]);

	const handleSlideChange = (index) => {
		setActiveIndex(index); // Update active index based on the slide change
	};

	// Choose colors based on brightness; threshold around 130 is reasonable
	const isBright = brightnessValues[activeIndex] > 130;
	const dotColor = isBright ? "#000000" : "#ffffff"; // Dark dots on bright images, light on dark

	return (
		<div className="carousel-container">
			<Carousel
				showArrows={true}
				infiniteLoop={true}
				showThumbs={false}
				showIndicators={true}
				showStatus={false}
				autoPlay={true}
				interval={3000}
				stopOnHover={true}
				transitionTime={600}
				onChange={handleSlideChange} // Track slide change
			>
				{images.map((image, index) => (
					<div key={index}>
						<img
							src={image}
							alt={`Slide ${index}`}
							style={{ objectFit: "cover", height: "400px" }}
						/>
					</div>
				))}
			</Carousel>

			{/* Inline styles for arrows and indicators */}
			<style>
				{`
					.carousel .control-dots .dot {
						background-color: ${dotColor}; /* Dots (indicators) color based on brightness */
					}
				`}
			</style>
		</div>
	);
};

export default ControlledCarousel;
