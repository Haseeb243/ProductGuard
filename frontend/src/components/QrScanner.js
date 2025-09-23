import React, { useEffect, useState } from "react";
import QrReader from "react-qr-scanner";

const QrScannerComponent = (props) => {
  const [data, setData] = useState("");

  useEffect(() => {
    console.info(data);
    props.passData(data);
  }, [data]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative aspect-square overflow-hidden rounded-lg shadow-lg">
        <QrReader
          delay={300}
          onScan={(result) => {
            if (result) {
              setData(result.text);
            }
          }}
          onError={(error) => {
            console.error(error);
          }}
          style={{ width: "100%", height: "100%" }}
          className="object-cover"
        />
      </div>
      {data && (
        <p className="mt-4 text-sm text-gray-600 text-center">
          Scanned: {data}
        </p>
      )}
    </div>
  );
};

export default QrScannerComponent;
