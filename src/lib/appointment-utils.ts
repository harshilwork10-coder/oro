// Helper functions for appointment booking

import { addMinutes, format, isBefore, isAfter, startOfDay } from 'date-fns'

export interface TimeSlot {
    time: string
    dateTime: Date
    available: boolean
}

/**
 * Generate time slots for a given date
 */
export function generateTimeSlots(
    date: Date,
    startHour: number = 9,
    endHour: number = 18,
    intervalMinutes: number = 30
): TimeSlot[] {
    const slots: TimeSlot[] = []
    const dayStart = new Date(date)
    dayStart.setHours(startHour, 0, 0, 0)

    const dayEnd = new Date(date)
    dayEnd.setHours(endHour, 0, 0, 0)

    let current = dayStart

    while (isBefore(current, dayEnd)) {
        slots.push({
            time: format(current, 'h:mm a'),
            dateTime: new Date(current),
            available: true, // Will be updated based on existing appointments
        })
        current = addMinutes(current, intervalMinutes)
    }

    return slots
}

/**
 * Check if a time slot conflicts with existing appointments
 */
export function checkTimeSlotAvailability(
    slotStart: Date,
    slotEnd: Date,
    existingAppointments: Array<{ startTime: Date; endTime: Date; status: string }>
): boolean {
    return !existingAppointments.some((apt) => {
        if (apt.status === 'CANCELLED') return false

        const aptStart = new Date(apt.startTime)
        const aptEnd = new Date(apt.endTime)

        // Check for overlap
        return (
            (isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart)) ||
            (isBefore(aptStart, slotEnd) && isAfter(aptEnd, slotStart))
        )
    })
}

/**
 * Calculate appointment end time based on service duration
 */
export function calculateEndTime(startTime: Date, durationMinutes: number): Date {
    return addMinutes(startTime, durationMinutes)
}

/**
 * Format appointment time for display
 */
export function formatAppointmentTime(date: Date): string {
    return format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a')
}

/**
 * Get time slots with availability marked
 */
export function getAvailableTimeSlots(
    date: Date,
    serviceDuration: number,
    existingAppointments: Array<{ startTime: Date; endTime: Date; status: string }>,
    startHour: number = 9,
    endHour: number = 18,
    intervalMinutes: number = 30
): TimeSlot[] {
    const slots = generateTimeSlots(date, startHour, endHour, intervalMinutes)

    return slots.map((slot) => {
        const slotEnd = calculateEndTime(slot.dateTime, serviceDuration)
        const available = checkTimeSlotAvailability(
            slot.dateTime,
            slotEnd,
            existingAppointments
        )

        return {
            ...slot,
            available,
        }
    })
}
