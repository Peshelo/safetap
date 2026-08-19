import React, { useEffect, useState } from "react";
import { Image } from "react-native";

const FALLBACK_IMAGE = require("../../assets/images/fallback.png");

export default function ArticleImage({ source, ...props }) {
  const [failed, setFailed] = useState(false);
  const remoteUri = source && typeof source === "object" ? source.uri : null;

  useEffect(() => setFailed(false), [remoteUri]);

  return (
    <Image
      {...props}
      source={!source || failed ? FALLBACK_IMAGE : source}
      defaultSource={FALLBACK_IMAGE}
      onError={() => setFailed(true)}
    />
  );
}

export { FALLBACK_IMAGE };
