import React from 'react';
import Lottie from "lottie-react";
import Recording from "./Recording2.json"

const LottieAnimation = () => {
    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: Recording,
       
    };

    return <Lottie options={defaultOptions} height={400} width={400} className='w-[30px] h-[40px] ' />;
};

export default LottieAnimation;
