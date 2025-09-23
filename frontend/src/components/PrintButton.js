import React, { useRef } from "react";
import ReactToPrint from "react-to-print";

export default function PrintButton() {
  let componentRef = useRef();

  return (
    <div className="w-full">
      <ReactToPrint
        trigger={() => (
          <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200">
            Print this out!
          </button>
        )}
        content={() => componentRef}
      />

      <div ref={(el) => (componentRef = el)} className="mt-4">
        <ComponentToPrint />
      </div>
    </div>
  );
}

