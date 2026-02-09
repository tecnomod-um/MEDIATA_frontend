// Testing library setup and configuration
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Create overlay element for Portal components
const overlayEl = document.createElement('div');
overlayEl.setAttribute('id', 'overlay');
document.body.appendChild(overlayEl);
