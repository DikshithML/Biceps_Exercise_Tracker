const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');
const repCountElement = document.getElementById('reps');
const feedbackElement = document.getElementById('feedback');
const chartElement = document.getElementById('chart');

let repCount = 0;
let isCurling = false; // Tracks if the arm is curling
let angleData = []; // Stores elbow angles for the graph
let labels = []; // Stores repetition numbers for the graph
let chart;

// Initialize MediaPipe Pose
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

// Start MediaPipe Pose
pose.onResults(onResults);

// Set up video stream
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
  });
  videoElement.srcObject = stream;
  return new Promise((resolve) => {
    videoElement.onloadedmetadata = () => resolve(videoElement);
  });
}

// Process pose results
function onResults(results) {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.poseLandmarks) {
    const landmarks = results.poseLandmarks;

    // Extract left arm landmarks
    const shoulder = landmarks[11];
    const elbow = landmarks[13];
    const wrist = landmarks[15];

    // Calculate elbow angle
    const angle = calculateAngle(shoulder, elbow, wrist);

    // Provide feedback and count repetitions
    provideFeedback(angle);
    countRepetitions(angle);

    // Draw pose landmarks
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 4,
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', radius: 4 });
  }
}

// Calculate angle between three points
function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = (radians * 180) / Math.PI;
  return angle < 0 ? angle + 360 : angle;
}

// Provide feedback based on elbow angle
function provideFeedback(angle) {
  if (angle < 45) {
    feedbackElement.innerText = "Full Curl";
  } else {
    feedbackElement.innerText = "";
  }
}

// Count repetitions based on elbow angle
function countRepetitions(angle) {
  if (angle > 160) {
    isCurling = true; // Arm is extended
  }

  if (angle < 45 && isCurling) {
    isCurling = false; // Curl is complete
    repCount++;
    repCountElement.innerText = repCount;

    // Update graph data
    labels.push(repCount);
    angleData.push(angle);
    updateChart();
  }
}

// Initialize Chart.js
function initChart() {
  chart = new Chart(chartElement, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Elbow Angle',
          data: [],
          borderColor: 'blue',
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Repetition' },
        },
        y: {
          title: { display: true, text: 'Angle (Degrees)' },
          min: 0,
          max: 180,
        },
      },
    },
  });
}

// Update Chart.js graph
function updateChart() {
  chart.data.labels = labels;
  chart.data.datasets[0].data = angleData;
  chart.update();
}

// Start processing video
async function processVideo() {
  await setupCamera();
  videoElement.play();
  initChart();

  async function detectPose() {
    if (videoElement.readyState === 4) {
      await pose.send({ image: videoElement });
    }
    requestAnimationFrame(detectPose);
  }

  detectPose();
}

// Start the program
processVideo();
