const { useState, useEffect, useMemo } = React;

const WindowReplacementGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [userLocation, setUserLocation] = useState('');
  const [climateZone, setClimateZone] = useState('');
  const [expandedRec, setExpandedRec] = useState(null);
  const [windowDatabase, setWindowDatabase] = useState([]);
  const [loading, setLoading] = useState(true);

  const climateZones = {
    WA: { zone: '4C', heating: true, cooling: false, description: 'Mixed-Humid, Cold Winters' },
    CA: { zone: '3B', heating: false, cooling: true, description: 'Warm-Dry, Hot Summers' },
    FL: { zone: '1A', heating: false, cooling: true, description: 'Very Hot-Humid' },
    TX: { zone: '2A', heating: false, cooling: true, description: 'Hot-Humid' },
    NY: { zone: '4A', heating: true, cooling: false, description: 'Mixed-Humid' },
    IL: { zone: '5A', heating: true, cooling: false, description: 'Cool-Humid' },
    CO: { zone: '5B', heating: true, cooling: false, description: 'Cool-Dry' },
    AZ: { zone: '2B', heating: false, cooling: true, description: 'Hot-Dry' }
  };

  const manufacturerDatabase = {
    Andersen: { reputation: 'Premium', customerService: 4.6, founded: 1903, specialty: 'Fibrex composite technology' },
    Pella: { reputation: 'Premium', customerService: 4.4, founded: 1925, specialty: 'Design innovation' },
    Marvin: { reputation: 'Luxury', customerService: 4.7, founded: 1912, specialty: 'Custom luxury windows' },
    Milgard: { reputation: 'Value', customerService: 4.2, founded: 1958, specialty: 'West Coast expertise' },
    'JELD-WEN': { reputation: 'Value', customerService: 4.1, founded: 1960, specialty: 'Broad product range' }
  };

  const installationRequirements = {
    homeAge: {
      new: { method: 'Insert or Full-Frame', timeframe: '1-2 days per 8-10 windows', permits: 'Usually not required', costModifier: 1.0 },
      medium: { method: 'Likely Insert', timeframe: '1-3 days per 8-10 windows', permits: 'Check local requirements', costModifier: 1.1 },
      old: { method: 'Often Full-Frame', timeframe: '2-4 days per 8-10 windows', permits: 'Likely required', costModifier: 1.3 },
      historic: { method: 'Specialized Full-Frame', timeframe: '3-5 days per 8-10 windows', permits: 'Historic approval required', costModifier: 1.5 }
    }
  };

  const calculatePricing = (window, location, homeAge) => {
    let basePrice = (window.priceRangeLow + window.priceRangeHigh) / 2;
    const locationModifiers = { WA: 1.15, CA: 1.25, NY: 1.20, FL: 1.05, TX: 1.00, IL: 1.10, CO: 1.08, AZ: 1.03 };
    const state = location.split(', ')[1] || 'WA';
    basePrice *= locationModifiers[state] || 1.0;
    const baseInstallCost = 200;
    const ageModifier = installationRequirements.homeAge[homeAge]?.costModifier || 1.0;
    const installCost = baseInstallCost * ageModifier;
    return {
      window: Math.round(basePrice),
      installation: Math.round(installCost),
      total: Math.round(basePrice + installCost)
    };
  };

  const updateLocation = (newLocation) => {
    setUserLocation(newLocation);
    const state = newLocation.split(', ')[1] || 'WA';
    const climate = climateZones[state] || climateZones.WA;
    setClimateZone(climate.zone);
    const climateType = climate.heating ? 'cold' : climate.cooling ? 'hot' : 'mixed';
    setUserAnswers(prev => ({ ...prev, climate: climateType }));
  };

  useEffect(() => {
    const detectLocation = async () => {
      try {
        console.log('Detecting location via IP...');
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.city && data.region) {
          const detectedLocation = `${data.city}, ${data.region}`;
          console.log('Detected location:', detectedLocation);
          setUserLocation(detectedLocation);
          updateLocation(detectedLocation);
        }
      } catch (error) {
        console.log('Location detection failed:', error);
        setUserLocation('');
        setClimateZone('');
      }
    };
    detectLocation();
  }, []);

  useEffect(() => {
    const loadWindowDatabase = async () => {
      try {
        console.log('Loading window database...');
        const response = await fetch('./window_replacement_dataset_20250622_001743.csv');
        if (response.ok) {
          const csvData = await response.text();
          const lines = csvData.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          console.log('CSV Headers:', headers);
          
          const windows = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim().replace(/^"|"$/g, ''));
            
            const window = {};
            headers.forEach((header, index) => {
              const value = values[index] || '';
              if (['id', 'priceRangeLow', 'priceRangeHigh', 'warrantyYears', 'popularityScore'].includes(header)) {
                window[header] = parseInt(value) || 0;
              } else if (['uFactor', 'shgc', 'customerRating'].includes(header)) {
                window[header] = parseFloat(value) || 0;
              } else {
                window[header] = value;
              }
            });
            
            if (window.brand && window.windowType && window.priceRangeLow) {
              windows.push(window);
            }
          }
          
          console.log(`Loaded ${windows.length} windows from CSV`);
          setWindowDatabase(windows);
        } else {
          console.log('Failed to load CSV, using fallback');
          setWindowDatabase([
            {
              id: 1, brand: 'Milgard', material: 'Fiberglass', model: 'Ultra Sliding', windowType: 'Sliding',
              glassType: 'Double Pane Low-E', priceRangeLow: 600, priceRangeHigh: 1100,
              energyRating: 'Energy Star Certified', uFactor: 0.29, shgc: 0.32, warrantyYears: 10,
              features: 'Low-E coating, Smooth operation', popularityScore: 82, customerRating: 4.2
            },
            {
              id: 2, brand: 'Andersen', material: 'Fibrex', model: 'Acclaim Sliding', windowType: 'Sliding',
              glassType: 'Double Pane Low-E', priceRangeLow: 1500, priceRangeHigh: 2500,
              energyRating: 'Energy Star Certified', uFactor: 0.22, shgc: 0.27, warrantyYears: 20,
              features: 'Fibrex low maintenance, Customizable colors', popularityScore: 90, customerRating: 4.6
            }
          ]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading database:', error);
        setWindowDatabase([
          {
            id: 1, brand: 'Milgard', material: 'Fiberglass', model: 'Ultra Sliding', windowType: 'Sliding',
            glassType: 'Double Pane Low-E', priceRangeLow: 600, priceRangeHigh: 1100,
            energyRating: 'Energy Star Certified', uFactor: 0.29, shgc: 0.32, warrantyYears: 10,
            features: 'Low-E coating, Smooth operation', popularityScore: 82, customerRating: 4.2
          },
          {
            id: 2, brand: 'Andersen', material: 'Fibrex', model: 'Acclaim Sliding', windowType: 'Sliding',
            glassType: 'Double Pane Low-E', priceRangeLow: 1500, priceRangeHigh: 2500,
            energyRating: 'Energy Star Certified', uFactor: 0.22, shgc: 0.27, warrantyYears: 20,
            features: 'Fibrex low maintenance, Customizable colors', popularityScore: 90, customerRating: 4.6
          }
        ]);
        setLoading(false);
      }
    };
    loadWindowDatabase();
  }, []);

  const questions = [
    {
      id: 'location',
      title: 'What is your location?',
      explanation: 'Location determines your climate zone and energy efficiency requirements.',
      type: 'location'
    },
    {
      id: 'budget',
      title: 'What is your budget range per window?',
      explanation: 'Budget determines available material options and features.',
      type: 'radio',
      options: [
        { value: 'budget', label: '$300-600 (Budget-friendly)', desc: 'Quality vinyl options' },
        { value: 'mid', label: '$600-1,000 (Mid-range)', desc: 'Fiberglass and premium vinyl' },
        { value: 'premium', label: '$1,000-2,000+ (Premium)', desc: 'Wood and luxury options' }
      ]
    },
    {
      id: 'priority',
      title: 'What are your top priorities?',
      explanation: 'Select your most important factors for window selection.',
      type: 'checkbox',
      options: [
        { value: 'energy', label: 'Energy efficiency', desc: 'Lower utility bills' },
        { value: 'durability', label: 'Long-term durability', desc: '20+ year lifespan' },
        { value: 'maintenance', label: 'Low maintenance', desc: 'Minimal upkeep' },
        { value: 'cost', label: 'Lowest upfront cost', desc: 'Budget-conscious' }
      ]
    },
    {
      id: 'windowTypes',
      title: 'What types of windows do you need?',
      explanation: 'Select all window styles you want to replace.',
      type: 'checkbox',
      options: [
        { value: 'Double-Hung', label: 'Double-Hung', desc: 'Traditional, easy to clean' },
        { value: 'Casement', label: 'Casement', desc: 'Maximum ventilation' },
        { value: 'Sliding', label: 'Sliding', desc: 'Simple operation' },
        { value: 'Picture', label: 'Picture', desc: 'Maximum light' }
      ]
    },
    {
      id: 'homeAge',
      title: 'How old is your home?',
      explanation: 'Home age affects installation requirements and costs.',
      type: 'radio',
      options: [
        { value: 'new', label: 'Less than 10 years', desc: 'Good frame condition' },
        { value: 'medium', label: '10-30 years', desc: 'May need inspection' },
        { value: 'old', label: '30+ years', desc: 'Possible frame replacement' },
        { value: 'historic', label: '50+ years (historic)', desc: 'Special considerations' }
      ]
    }
  ];

  const handleAnswer = (questionId, value) => {
    setUserAnswers(prev => {
      const current = prev[questionId] || [];
      const question = questions.find(q => q.id === questionId);
      if (question?.type === 'checkbox') {
        const newValue = current.includes(value) 
          ? current.filter(v => v !== value)
          : [...current, value];
        return { ...prev, [questionId]: newValue };
      } else {
        return { ...prev, [questionId]: value };
      }
    });
  };

  const nextStep = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowRecommendations(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateExplanation = (window, userAnswers) => {
    const reasons = [];
    const pricing = calculatePricing(window, userLocation, userAnswers.homeAge || 'medium');
    const budget = userAnswers.budget;
    
    if (budget === 'budget' && pricing.total < 1000) {
      reasons.push(`Excellent budget value at $${pricing.total} total cost`);
    } else if (budget === 'mid' && pricing.total >= 800 && pricing.total <= 1500) {
      reasons.push(`Great mid-range value at $${pricing.total} total cost`);
    } else {
      reasons.push(`Total cost: $${pricing.total} per window`);
    }

    const windowTypes = userAnswers.windowTypes || [];
    if (windowTypes.includes(window.windowType)) {
      reasons.push(`Perfect match for your ${window.windowType} selection`);
    }

    const manufacturer = manufacturerDatabase[window.brand];
    if (manufacturer) {
      reasons.push(`${manufacturer.reputation} ${window.brand} brand (${manufacturer.customerService}/5 rating)`);
    }

    const priorities = userAnswers.priority || [];
    if (priorities.includes('energy') && window.uFactor < 0.25) {
      reasons.push(`Excellent energy efficiency with U-Factor of ${window.uFactor}`);
    }
    if (priorities.includes('durability') && window.material === 'Fiberglass') {
      reasons.push(`Fiberglass offers superior durability and longevity`);
    }

    return reasons.slice(0, 4);
  };

  const processAIChatMessage = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('cost') || lowerMessage.includes('price')) {
      return 'Window costs vary by material:\n• Vinyl: $300-800 + installation\n• Fiberglass: $600-1,200 + installation\n• Wood: $800-2,000+ + installation\n\nYour location affects pricing due to labor costs and regulations.';
    }
    
    if (lowerMessage.includes('energy')) {
      return 'Energy efficiency key factors:\n• U-Factor: Lower is better (0.15-0.30)\n• SHGC: Lower for hot climates\n• Triple-pane glass: 50% more efficient\n• Low-E coatings: 10-25% energy savings';
    }
    
    if (lowerMessage.includes('material')) {
      return 'Material comparison:\n• Fiberglass: Best durability, paintable, 50+ years\n• Vinyl: Most affordable, low maintenance, 20-30 years\n• Wood: Beautiful, customizable, requires maintenance\n• Aluminum: Modern look, poor insulation';
    }
    
    return 'I can help with window costs, energy efficiency, materials, brands, and installation. What would you like to know?';
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    
    setChatHistory(prev => [...prev, { type: 'user', text: chatMessage }]);
    
    setTimeout(() => {
      const response = processAIChatMessage(chatMessage);
      setChatHistory(prev => [...prev, { type: 'ai', text: response }]);
    }, 1000);
    
    setChatMessage('');
  };

  const recommendations = useMemo(() => {
    if (!showRecommendations || windowDatabase.length === 0) return [];

    console.log('Generating recommendations from', windowDatabase.length, 'windows');
    console.log('User selections:', userAnswers);

    const scored = windowDatabase.map(window => {
      let score = 0;
      const manufacturer = manufacturerDatabase[window.brand] || {};
      const pricing = calculatePricing(window, userLocation, userAnswers.homeAge || 'medium');

      const windowTypes = userAnswers.windowTypes || [];
      if (windowTypes.length > 0) {
        if (!windowTypes.includes(window.windowType)) {
          return null;
        } else {
          score += 50;
        }
      }

      const budget = userAnswers.budget;
      if (budget === 'budget' && pricing.total < 1000) {
        score += 40;
      } else if (budget === 'mid' && pricing.total >= 800 && pricing.total <= 1500) {
        score += 40;
      } else if (budget === 'premium' && pricing.total > 1200) {
        score += 40;
      }

      const climate = userAnswers.climate;
      if (climate === 'cold' && window.uFactor < 0.25) {
        score += 30;
      } else if (climate === 'hot' && window.shgc < 0.30) {
        score += 30;
      }

      const priorities = userAnswers.priority || [];
      if (priorities.includes('energy') && window.uFactor < 0.25) {
        score += 20;
      }
      if (priorities.includes('durability') && window.material === 'Fiberglass') {
        score += 15;
      }
      if (priorities.includes('maintenance') && window.material === 'Vinyl') {
        score += 15;
      }
      if (priorities.includes('cost') && pricing.total < 1000) {
        score += 15;
      }

      if (manufacturer.reputation === 'Luxury') {
        score += 15;
      } else if (manufacturer.reputation === 'Premium') {
        score += 10;
      }

      const reasons = generateExplanation(window, userAnswers);
      const installReqs = installationRequirements.homeAge[userAnswers?.homeAge || 'medium'];

      return { 
        ...window, 
        score, 
        reasons,
        pricing,
        installationRequirements: installReqs,
        manufacturer
      };
    }).filter(w => w !== null);

    const sortedResults = scored.sort((a, b) => b.score - a.score).slice(0, 5);
    console.log('Final recommendations:', sortedResults.length);
    return sortedResults;
  }, [userAnswers, showRecommendations, windowDatabase, userLocation]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading window database...</p>
        </div>
      </div>
    );
  }

  if (showRecommendations) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Window Recommendations</h1>
          <p className="text-lg text-gray-600">Based on {windowDatabase.length} windows in our database</p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <lucidei.MapPin className="inline w-4 h-4 mr-1" />
              Location: {userLocation || 'Location detection in progress'} 
              {climateZone && ` • Climate Zone: ${climateZone}`}
            </p>
            {userAnswers.windowTypes && (
              <p className="text-sm text-blue-700 mt-1">
                Selected Types: {userAnswers.windowTypes.join(', ')}
              </p>
            )}
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-600">No windows match your criteria. Please adjust your selections.</p>
            <button
              onClick={() => {setShowRecommendations(false); setCurrentStep(0);}}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Modify Criteria
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {recommendations.map((value, index) => (
              <div key={value.id} className="border border-gray-200 rounded-lg p-6 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        #{index + 1} Recommended
                      </span>
                      <div className="flex items-center">
                        <lucidei.Star className="w-5 h-5 text-yellow-400 fill-current" />
                        <span className="text-lg font-semibold ml-1">{value.customerRating}</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{value.brand} {value.model}</h3>
                    <p className="text-lg text-gray-600">{value.material} • {value.windowType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${value.pricing.window}</p>
                    <p className="text-sm text-gray-500">+ ${pricing.installation} installation</p>
                    <p className="text-lg font-semibold text-gray-800">Total: value.pricing.total}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Why This Window?</h4>
                  <ul className="space-y-2">
                    {value.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <lucidei.CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0">
                          <span className="text-gray-700">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => setExpandedRec(expandedRec === value.id ? null : value.id)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {expandedRec === value.id ? 'Hide Details' : 'Show Details'}
                    {expandedRec === value.id ? <lucidei.ChevronUp className="w-4 h-4" /> : <lucidei.ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedRec === value.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-2">Technical Specs</h5>
                          <ul className="space-y-1 text-sm">
                            <ul>
                              <li>Glass: {value.glassType}</li>
                              <li>U-Factor: {value.uFactor}</li>
                              <li>SHGC: {value.shgc}</li>
                              <li>Warranty: {value.warrantyYears} years</li>
                              <li>Energy Rating: {value.energyRating}</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">Installation Info</h5>
                            <ul className="space-y-1 text-sm">
                              <li>Method: {value.installationRequirements.method}</li>
                              <li>Timeline: {value.installationRequirements.timeframe}</li>
                              <li>Permits: {value.installationRequirements.permits}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              <div className="mt-8 text-center">
                <button
                  onClick={() => {setShowRecommendations(false); setCurrentStep(0);}}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Start Over
                </button>
              </div>

              <div className="fixed bottom-4 right-4 z-50">
                <div className={`bg-white border rounded-lg shadow-xl transition-all ${chatOpen ? 'w-96 h-96' : 'w-16 h-16'}`}>
                  <div className={`bg-white border rounded-lg shadow-xl transition-all ${chatOpen ? 'w-96 h-96' : 'w-16 h-16'}`}>
                    {!chatOpen ? (
                      <button
                        onClick={() => setChatOpen(true)}
                        className="w-full h-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                      >
                        <lucidei.MessageCircle className="w-6 h-6" />
                      </button>
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center p-3 border-b">
                          <h3 className="font-semibold">Window Expert</h3>
                          <button onClick={() => setChatOpen(false)} className="text-gray-400">×</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                          {chatHistory.length === 0 && (
                            <div className="text-gray-500 text-sm">Ask me about windows!</div>
                          )}
                          {chatHistory.map((msg, i) => (
                            <div key={i} className={`p-2 rounded text-sm ${msg.type === 'user' ? 'bg-blue-100 ml-4' : 'bg-gray-100 mr-4'}`}>
                              {msg.text}
                            </div>
                          ))}
                        </div>
                        <div className="p-3 border-t">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={chatMessage}
                              onChange={(e) => setChatMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                              placeholder="Ask about windows..."
                              className="flex-1 px-3 py-2 border rounded text-sm"
                            />
                            <button
                              onClick={sendChatMessage}
                              className="bg-blue-600 text-white px-3 py-2 rounded"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))};
          </div>
        ))};

      const currentQuestion = questions[currentStep];
      const isAnswered = currentQuestion.type === 'location' ? 
        (userLocation && userLocation.includes(',') && climateZone) :
        userAnswers[currentQuestion.id];
      const canProceed = currentQuestion.type === 'location' ?
        (userLocation && userLocation.includes(',') && climateZone) :
        currentQuestion.type === 'checkbox' ? 
          (userAnswers[currentQuestion.id] && userAnswers[currentQuestion.id].length > 0) : 
          isAnswered;

      return (
        <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Expert Window Replacement Guide</h1>
            <p className="text-lg text-gray-600 mb-6">
              Get personalized recommendations from our database of {windowDatabase.length}+ windows
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <lucidei.MapPin className="w-4 h-4" />
              <span>
                {userLocation ? `Optimized for ${userLocation}` : 'Detecting your location...'}
                {climateZone && ` • Climate Zone ${climateZone}`}
              </span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm text-gray-600">{currentStep + 1} of {questions.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                {currentStep === 0 && <lucidei.MapPin className="w-6 h-6 text-blue-600" />}
                {currentStep === 1 && <lucidei.DollarSign className="w-6 h-6 text-blue-600" />}
                {currentStep === 2 && <lucidei.Star className="w-6 h-6 text-blue-600" />}
                {currentStep === 3 && <lucidei.Home className="w-6 h-6 text-blue-600" />}
                {currentStep === 4 && <lucidei.Settings className="w-6 h-6 text-blue-600" />}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{currentQuestion.title}</h2>
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <div className="flex items-start gap-2">
                    <lucidei.Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-800 text-sm">{currentQuestion.explanation}</p>
                  </div>
                </div>
              </div>
            </div>

            {currentQuestion.type === 'location' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your city and state (e.g., "Seattle, WA")
                  </label>
                  <input
                    type="text"
                    value={userLocation}
                    onChange={(e) => {
                      const newLocation = e.target.value;
                      setUserLocation(newLocation);
                      if (newLocation.includes(',') && newLocation.split(',').length === 2) {
                        updateLocation(newLocation.trim());
                      }
                    }}
                    placeholder="Enter your location..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {userLocation && climateZone && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ Detected Climate Zone: {climateZone} - {climateZones[userLocation.split(', ')[1]]?.description}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Climate needs automatically determined based on your location
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option.value}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                      currentQuestion.type === 'checkbox'
                        ? (userAnswers[currentQuestion.id] || []).includes(option.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                        : userAnswers[currentQuestion.id] === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type={currentQuestion.type === 'checkbox' ? 'checkbox' : 'radio'}
                        name={currentQuestion.id}
                        value={option.value}
                        checked={
                          currentQuestion.type === 'checkbox'
                            ? (userAnswers[currentQuestion.id] || []).includes(option.value)
                            : userAnswers[currentQuestion.id] === option.value
                        }
                        onChange={() => handleAnswer(currentQuestion.id, option.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'checkbox' && (
              <p className="text-sm text-gray-500 mt-4">
                Select all that apply. You can choose multiple options.
              </p>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>

            <div className="text-sm text-gray-500">
              {canProceed ? '✓ Question answered' : 'Please select an option to continue'}
            </div>

            <button
              onClick={nextStep}
              disabled={!canProceed}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                !canProceed
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {currentStep === questions.length - 1 ? 'Get Recommendations' : 'Next'}
              <lucidei.ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="fixed bottom-4 right-4 z-50">
            <div className={`bg-white border rounded-lg shadow-xl transition-all ${chatOpen ? 'w-96 h-96' : 'w-16 h-16'}`}>
              {!chatOpen ? (
                <button
                  onClick={() => setChatOpen(true)}
                  className="w-full h-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <lucidei.MessageCircle className="w-6 h-6" />
                </button>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center p-3 border-b">
                    <h3 className="font-semibold">Window Expert</h3>
                    <button onClick={() => setChatOpen(false)} className="text-gray-400">×</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatHistory.length === 0 && (
                      <div className="text-gray-500 text-sm">Ask me about windows!</div>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`p-2 rounded text-sm ${msg.type === 'user' ? 'bg-blue-100 ml-4' : 'bg-gray-100 mr-4'}`}>
                        {msg.text}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                        placeholder="Ask about windows..."
                        className="flex-1 px-3 py-2 border rounded text-sm"
                      />
                      <button
                        onClick={sendChatMessage}
                        className="bg-blue-600 text-white px-3 py-2 rounded"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    ReactDOM.render(<WindowReplacementGuide />, document.getElementById('root'));
