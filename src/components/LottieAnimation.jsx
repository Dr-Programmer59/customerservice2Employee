import React from 'react';
import Lottie from 'react-lottie';
import animationData from 'Recording2.json';

const LottieAnimation = () => {
    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
       
    };

    return <Lottie options={defaultOptions} height={400} width={400} className='w-[30px] h-[40px] ' />;
};

export default LottieAnimation;
