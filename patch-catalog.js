const fs = require('fs');
const file = 'src/app/api/franchise/services/route.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `        const services = await prisma.service.findMany({
            where: whereClause,
            include: { serviceCategory: true },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(services)`;

const replacement = `        const services = await prisma.service.findMany({
            where: whereClause,
            include: { serviceCategory: true },
            orderBy: { name: 'asc' }
        })
        
        let globalServices = []
        if (user.role !== 'FRANCHISOR' && user.franchise && user.franchise.franchisorId) {
            // Get brand catalog overlay
            const rawGlobal = await prisma.globalService.findMany({
                where: { 
                    franchisorId: user.franchise.franchisorId,
                    isActive: true,
                    isArchived: false
                },
                include: { category: true }
            })
            globalServices = rawGlobal.map(gs => ({
                id: gs.id,
                name: gs.name,
                description: gs.description,
                price: gs.basePrice,
                duration: gs.duration,
                category: gs.category?.name || "Brand Catalog",
                isGlobal: true
            }))
        }

        return NextResponse.json([...globalServices, ...services])`;

content = content.replace(/\r\n/g, '\n').replace(target.replace(/\r\n/g, '\n'), replacement);

fs.writeFileSync(file, content);
console.log('Patched franchise services route!');
