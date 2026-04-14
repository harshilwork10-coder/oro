const fs = require('fs');
const file = 'src/app/api/provider/provisioning-tasks/[id]/route.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `    // If marked DONE, update location status to READY_FOR_INSTALL
    if (status === 'DONE') {
        await prisma.location.update({
            where: { id: task.locationId },
            data: { provisioningStatus: 'READY_FOR_INSTALL' }
        });
    }`;

const replacement = `    // If marked DONE, update location status to READY_FOR_INSTALL and approve franchise
    if (status === 'DONE') {
        await prisma.$transaction([
            prisma.location.update({
                where: { id: task.locationId },
                data: { provisioningStatus: 'READY_FOR_INSTALL' }
            }),
            prisma.franchise.update({
                where: { id: task.franchiseeBusinessId },
                data: { approvalStatus: 'APPROVED' }
            })
        ]);
    }`;

// Normalize line endings to avoid regex issues
content = content.replace(/\r\n/g, '\n');

if (content.includes(target.replace(/\r\n/g, '\n'))) {
    content = content.replace(target.replace(/\r\n/g, '\n'), replacement);
    fs.writeFileSync(file, content);
    console.log('Patched franchise approval status!');
} else {
    console.log('Target not found.');
}
