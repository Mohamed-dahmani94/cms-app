import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET a single project (admin only) */
export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const project = await prisma.project.findUnique({
            where: { id: params.id },
        });
        return NextResponse.json(project);
    } catch (error: any) {
        console.error("[PROJECT_GET]", error);
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
}

/** PATCH (update) a project – admin only */
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json()
        const {
            name, description, location, startDate, endDate, status,
            client, estimatedCost,
            billingMode, taxRate, currencyUnit, currencyDecimals, quantityDecimals
        } = body

        const project = await prisma.project.update({
            where: { id: params.id },
            data: {
                name,
                description,
                location,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status,
                client,
                estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
                billingMode,
                taxRate: taxRate !== undefined ? parseFloat(taxRate) : undefined,
                currencyUnit,
                currencyDecimals: currencyDecimals !== undefined ? parseInt(currencyDecimals) : undefined,
                quantityDecimals: quantityDecimals !== undefined ? parseInt(quantityDecimals) : undefined,
            }
        })

        return NextResponse.json(project)
    } catch (error: any) {
        console.error("[PROJECT_PATCH]", error);
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
}

/** DELETE a project – admin only */
export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await prisma.project.delete({
            where: { id: params.id },
        });
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        console.error("[PROJECT_DELETE]", error);
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
}
