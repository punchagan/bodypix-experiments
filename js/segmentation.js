const models = {
  resnet: {
    architecture: "ResNet50",
    outputStride: 16,
    multiplier: 1,
    quantBytes: 2
  },
  mobilenet: {
    architecture: "MobileNetV1",
    outputStride: 8,
    multiplier: 0.75,
    quantBytes: 2
  }
};

const readImageFileHandler = img => {
  return event => {
    console.log(event.target.files[0]);
    const file = event.target.files[0];

    const reader = new FileReader();
    reader.onload = (function(img) {
      return function(e) {
        img.src = e.target.result;
      };
    })(img);
    reader.readAsDataURL(file);
  };
};

async function setupImageProcessing(net) {
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const fgInput = document.querySelector("#fgImage");
  const fgImg = new Image();

  fgInput.addEventListener("change", readImageFileHandler(fgImg));

  // Load the image on canvas
  fgImg.addEventListener("load", async () => {
    // Set canvas width, height same as image
    canvas.width = fgImg.width;
    canvas.height = fgImg.height;
    ctx.drawImage(fgImg, 0, 0);
    console.log(net);
    processImage(net, canvas);
  });
}

async function segmentImage(net, img) {
  const segmentation = await net.segmentPerson(img, {
    flipHorizontal: false,
    internalResolution: "medium",
    segmentationThreshold: 0.7
  });

  return segmentation;
}

async function processImage(net, canvas) {
  const segmentation = await segmentImage(net, canvas);
  colourPop(canvas, segmentation);
}

// Display all pixels without humans in non-colour
async function colourPop(canvas, segmentation) {
  const ctx = canvas.getContext("2d");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const imageData = image.data;

  // Creating new image data
  const newImage = ctx.createImageData(canvas.width, canvas.height);
  const newImageData = newImage.data;

  console.log(segmentation);

  // Apply the effect
  for (let i = 0; i < segmentation.data.length; i++) {
    // Extract data into r, g, b, a from imgData
    const [r, g, b, a] = [
      imageData[i * 4],
      imageData[i * 4 + 1],
      imageData[i * 4 + 2],
      imageData[i * 4 + 3]
    ];

    // Calculate the gray color
    const gray = 0.3 * r + 0.59 * g + 0.11 * b;

    // Set new RGB color to gray if map value is not 1
    // for the current pixel in iteration
    [
      newImageData[i * 4],
      newImageData[i * 4 + 1],
      newImageData[i * 4 + 2],
      newImageData[i * 4 + 3]
    ] = !segmentation.data[i] ? [gray, gray, gray, 255] : [r, g, b, a];
  }

  ctx.putImageData(newImage, 0, 0);
}

(async () => {
  const net = await bodyPix.load(models["resnet"]);
  console.log(net);
  await setupImageProcessing(net);
})();
