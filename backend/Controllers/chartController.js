import Patient from '../Models/patientSchema.js';
import Visit from '../Models/visitSchema.js';

const humanizeLabel = (label) => {
    if (!label) return 'Unknown';

    const formatted = label
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return formatted;
};

export const getDiseaseStatsData = async (req, res) => {
    try {
        const chronicConditionsStats = await Patient.aggregate([
            {
                $match: {
                    isActive: true,
                    chronicConditions: { $exists: true, $ne: [] }
                }
            },
            { $unwind: '$chronicConditions' },
            {
                $group: {
                    _id: '$chronicConditions',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const symptomStats = await Visit.aggregate([
            {
                $facet: {
                    pregnantSymptoms: [
                        { $match: { 'pregnantVisit.symptoms': { $exists: true, $ne: [] } } },
                        { $unwind: '$pregnantVisit.symptoms' },
                        {
                            $group: {
                                _id: '$pregnantVisit.symptoms',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    childSymptoms: [
                        { $match: { 'childVisit.symptoms': { $exists: true, $ne: [] } } },
                        { $unwind: '$childVisit.symptoms' },
                        {
                            $group: {
                                _id: '$childVisit.symptoms',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    adultSymptoms: [
                        { $match: { 'adultVisit.symptoms': { $exists: true, $ne: [] } } },
                        { $unwind: '$adultVisit.symptoms' },
                        {
                            $group: {
                                _id: '$adultVisit.symptoms',
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        const allSymptoms = [
            ...(symptomStats[0]?.pregnantSymptoms || []),
            ...(symptomStats[0]?.childSymptoms || []),
            ...(symptomStats[0]?.adultSymptoms || [])
        ];

        const symptomsMap = {};
        allSymptoms.forEach(symptom => {
            const key = symptom._id;
            symptomsMap[key] = (symptomsMap[key] || 0) + symptom.count;
        });

        const combinedSymptoms = Object.entries(symptomsMap)
            .map(([symptom, count]) => ({ _id: symptom, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const [categoryStats, riskStats] = await Promise.all([
            Patient.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Patient.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$currentRiskLevel',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const vibrantColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
            '#E7E9ED', '#8E44AD'
        ];

        const riskColors = {
            'high': '#FF6384',
            'monitor': '#FFCE56',
            'normal': '#4BC0C0'
        };

        const categoryColors = {
            'pregnant': '#FF6384',
            'child': '#36A2EB',
            'adult': '#FFCE56'
        };

        const chartData = {
            chronicConditions: {
                labels: chronicConditionsStats.map(item => humanizeLabel(item._id)),
                data: chronicConditionsStats.map(item => item.count),
                backgroundColor: vibrantColors.slice(0, chronicConditionsStats.length),
                total: chronicConditionsStats.reduce((sum, item) => sum + item.count, 0)
            },
            symptoms: {
                labels: combinedSymptoms.map(item => humanizeLabel(item._id)),
                data: combinedSymptoms.map(item => item.count),
                backgroundColor: vibrantColors.slice(0, combinedSymptoms.length),
                total: combinedSymptoms.reduce((sum, item) => sum + item.count, 0)
            },
            categories: {
                labels: categoryStats.map(item => humanizeLabel(item._id)),
                data: categoryStats.map(item => item.count),
                backgroundColor: categoryStats.map(item => categoryColors[item._id] || '#C9CBCF'),
                total: categoryStats.reduce((sum, item) => sum + item.count, 0)
            },
            riskLevels: {
                labels: riskStats.map(item => humanizeLabel(item._id)),
                data: riskStats.map(item => item.count),
                backgroundColor: riskStats.map(item => riskColors[item._id] || '#C9CBCF'),
                total: riskStats.reduce((sum, item) => sum + item.count, 0)
            }
        };

        res.json({
            success: true,
            message: 'Disease statistics retrieved successfully',
            data: chartData,
            metadata: {
                totalPatients: await Patient.countDocuments({ isActive: true }),
                totalVisits: await Visit.countDocuments(),
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Get Disease Stats Data Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch disease statistics',
            details: error.message
        });
    }
};
