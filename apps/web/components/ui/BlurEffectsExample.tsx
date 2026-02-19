import React from 'react';
import BlurText, { BlurComponent } from './BlurEffects';

const BlurEffectsExample = () => {
  return (
    <div className="space-y-8 p-8">
      <BlurText 
        text="This is a blur text animation with words" 
        animateBy="words"
        className="text-2xl font-bold text-white"
      />
      
      <BlurText animateBy="components" className="space-x-4">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Button 1
        </button>
        <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
          Button 2
        </button>
        <div className="px-4 py-2 bg-purple-500 text-white rounded-lg">
          Custom Component
        </div>
      </BlurText>
      
      <BlurComponent className="space-y-2" direction="bottom" delay={300}>
        <div className="p-4 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg text-white">
          <h3 className="text-lg font-semibold">Card Title</h3>
          <p>This entire card animates with blur effect</p>
        </div>
        <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg text-white">
          <h3 className="text-lg font-semibold">Another Card</h3>
          <p>Each card animates separately</p>
        </div>
      </BlurComponent>
      
      <BlurText 
        as="section" 
        animateBy="components" 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        delay={150}
      >
        <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <h4 className="text-xl font-bold text-white mb-2">Feature 1</h4>
          <p className="text-gray-300">Description of feature 1</p>
        </div>
        <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <h4 className="text-xl font-bold text-white mb-2">Feature 2</h4>
          <p className="text-gray-300">Description of feature 2</p>
        </div>
        <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <h4 className="text-xl font-bold text-white mb-2">Feature 3</h4>
          <p className="text-gray-300">Description of feature 3</p>
        </div>
      </BlurText>
    </div>
  );
};

export default BlurEffectsExample;
